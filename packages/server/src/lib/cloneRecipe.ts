import type {RecipeDetail, RecipeInput} from '@eciperay/types';

import {runTransactional} from '../db/withTransaction.js';
import {query as defaultQuery} from '../db/query.js';
import {
  GET_RECIPE_DETAIL_SQL,
  insertIngredients,
  insertInstructions,
  linkTags,
} from '../routes/recipes/queries.js';
import {GET_PUBLIC_RECIPE_DETAIL_SQL} from '../routes/recipes/sqlConstants.js';
import {
  buildVersionOptions,
  insertClonedLineage,
  insertVersion,
  setActiveVersion,
} from '../routes/recipes/versionQueries.js';

import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';
import {canReadRecipe, toRecipeAccessRecord} from './recipeAccess.js';
import {RecipeNotFoundError} from './saveRecipeFromInput.js';
import {userHasShareGrant} from './shareGrant.js';
import {slugifyRecipeTitle} from './slugifyRecipeTitle.js';

type QueryFn = typeof defaultQuery;

export class RecipeAccessDeniedError extends Error {
  constructor() {
    super('Recipe access denied');
    this.name = 'RecipeAccessDeniedError';
  }
}

export const FILTER_CLONABLE_TAG_IDS_SQL = `
  select id::text
  from tags
  where id = any($1::uuid[])
    and (user_id = $2 or is_preset = true)
`;

export const filterClonableTagIds = async (
  tagIds: string[],
  clonerUserId: string,
  queryFn: QueryFn,
): Promise<string[]> => {
  if (tagIds.length === 0) {
    return [];
  }
  const result = await queryFn<{id: string}>(FILTER_CLONABLE_TAG_IDS_SQL, [
    tagIds,
    clonerUserId,
  ]);
  return result.rows.map(row => row.id);
};

export const recipeDetailToCloneInput = (
  recipe: RecipeDetail,
  tagIds: string[],
): RecipeInput => ({
  title: recipe.title,
  description: recipe.description,
  servings: recipe.servings,
  prepTimeMin: recipe.prepTimeMin,
  cookTimeMin: recipe.cookTimeMin,
  imageUrl: recipe.imageUrl,
  sourceUrl: recipe.sourceUrl,
  tagIds,
  ingredients: recipe.ingredients.map(
    ({sortOrder, name, quantity, unit, notes, isOptional}) => ({
      sortOrder,
      name,
      quantity,
      unit,
      notes,
      isOptional,
    }),
  ),
  instructions: recipe.instructions.map(({stepNumber, body}) => ({
    stepNumber,
    body,
  })),
});

const loadSourceRecipe = async (sourceRecipeId: string, queryFn: QueryFn) => {
  const result = await queryFn(GET_PUBLIC_RECIPE_DETAIL_SQL, [sourceRecipeId]);
  const row = result.rows[0] as
    | Parameters<typeof mapRowToRecipeDetail>[0]
    | undefined;
  if (!row) {
    throw new RecipeNotFoundError();
  }
  return row;
};

const assertCanCloneRecipe = async (
  row: Parameters<typeof mapRowToRecipeDetail>[0],
  clonerUserId: string,
  shareToken: string | undefined,
  queryFn: QueryFn,
) => {
  const accessRecord = toRecipeAccessRecord(row);

  if (accessRecord.visibility === 'private') {
    throw new RecipeNotFoundError();
  }

  const hasShareGrant = await userHasShareGrant(row.id, clonerUserId, queryFn);

  if (
    !canReadRecipe(accessRecord, {
      userId: clonerUserId,
      shareToken,
      hasShareGrant,
    })
  ) {
    throw new RecipeAccessDeniedError();
  }
};

export const cloneRecipeForUser = async (
  sourceRecipeId: string,
  clonerUserId: string,
  shareToken: string | undefined,
  queryFn: QueryFn,
): Promise<RecipeDetail> => {
  const sourceRow = await loadSourceRecipe(sourceRecipeId, queryFn);
  await assertCanCloneRecipe(sourceRow, clonerUserId, shareToken, queryFn);

  const source = mapRowToRecipeDetail(sourceRow);
  const tagIds = await filterClonableTagIds(
    source.tags.map(tag => tag.id),
    clonerUserId,
    queryFn,
  );
  const input = recipeDetailToCloneInput(source, tagIds);

  const {recipeId} = await runTransactional(queryFn, async q => {
    const lineage = await insertClonedLineage(
      clonerUserId,
      slugifyRecipeTitle(input.title),
      sourceRecipeId,
      q,
    );
    const recipeId = lineage.rows[0]?.id;
    if (!recipeId) {
      throw new Error('Failed to create cloned recipe');
    }
    const version = await insertVersion(
      buildVersionOptions({
        input,
        recipeId,
        versionNumber: 1,
        createdVia: 'manual',
      }),
      q,
    );
    const versionId = version.rows[0]?.id;
    if (!versionId) {
      throw new Error('Failed to create cloned recipe version');
    }
    await setActiveVersion(recipeId, versionId, q);
    await insertIngredients(versionId, input.ingredients, q);
    await insertInstructions(versionId, input.instructions, q);
    await linkTags(versionId, input.tagIds, q);
    return {recipeId, versionId};
  });

  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, clonerUserId]);
  const row = detail.rows[0];
  if (!row) {
    throw new RecipeNotFoundError();
  }
  return mapRowToRecipeDetail(
    row as Parameters<typeof mapRowToRecipeDetail>[0],
  );
};
