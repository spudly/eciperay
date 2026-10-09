import type {RecipeInput} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';

export {
  GET_RECIPE_DETAIL_SQL,
  GET_VERSION_DETAIL_SQL,
  LIST_VERSIONS_SQL,
} from './sqlConstants.js';

type QueryFn = typeof defaultQuery;

type IngredientData = {
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  isOptional: boolean;
};

const INGREDIENT_SQL = `insert into ingredients
     (recipe_version_id, sort_order, name, quantity, unit, notes, is_optional)
   values ($1,$2,$3,$4,$5,$6,$7)`;

const ingredientParams = (
  versionId: string,
  sortOrder: number,
  data: IngredientData,
) => [
  versionId,
  sortOrder,
  data.name,
  data.quantity,
  data.unit,
  data.notes,
  data.isOptional,
];

const toIngredientData = (
  ing: RecipeInput['ingredients'][number],
): IngredientData => ({
  name: ing.name,
  quantity: ing.quantity ?? null,
  unit: ing.unit ?? null,
  notes: ing.notes ?? null,
  isOptional: ing.isOptional,
});

const insertIngredient = (
  versionId: string,
  sortOrder: number,
  data: IngredientData,
  queryFn: QueryFn,
) => queryFn(INGREDIENT_SQL, ingredientParams(versionId, sortOrder, data));

export const insertIngredients = (
  versionId: string,
  ingredients: RecipeInput['ingredients'],
  queryFn: QueryFn,
) =>
  Promise.all(
    ingredients.map(ing =>
      insertIngredient(
        versionId,
        ing.sortOrder,
        toIngredientData(ing),
        queryFn,
      ),
    ),
  );

const insertInstruction = (
  versionId: string,
  stepNumber: number,
  body: string,
  queryFn: QueryFn,
) =>
  queryFn(
    'insert into instructions (recipe_version_id, step_number, body) values ($1,$2,$3)',
    [versionId, stepNumber, body],
  );

export const insertInstructions = (
  versionId: string,
  instructions: RecipeInput['instructions'],
  queryFn: QueryFn,
) =>
  Promise.all(
    instructions.map(ins =>
      insertInstruction(versionId, ins.stepNumber, ins.body, queryFn),
    ),
  );

const linkTag = (versionId: string, tagId: string, queryFn: QueryFn) =>
  queryFn(
    'insert into recipe_tags (recipe_version_id, tag_id) values ($1,$2) on conflict do nothing',
    [versionId, tagId],
  );

export const linkTags = (
  versionId: string,
  tagIds: string[],
  queryFn: QueryFn,
) => Promise.all(tagIds.map(tagId => linkTag(versionId, tagId, queryFn)));

export const deleteIngredientsByVersionId = (
  versionId: string,
  queryFn: QueryFn,
) =>
  queryFn('delete from ingredients where recipe_version_id = $1', [versionId]);

export const deleteInstructionsByVersionId = (
  versionId: string,
  queryFn: QueryFn,
) =>
  queryFn('delete from instructions where recipe_version_id = $1', [versionId]);

export const deleteRecipeTagsByVersionId = (
  versionId: string,
  queryFn: QueryFn,
) =>
  queryFn('delete from recipe_tags where recipe_version_id = $1', [versionId]);

export const deleteRecipeById = (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
) =>
  queryFn('delete from recipes where id=$1 and user_id=$2', [recipeId, userId]);

export const setVersionImageUrl = (
  versionId: string,
  imageUrl: string,
  queryFn: QueryFn,
) =>
  queryFn(
    'update recipe_versions set image_url = $2 where id = $1 returning id',
    [versionId, imageUrl],
  );
