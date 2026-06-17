import type {RecipeDetail, RecipeInput} from '@eciperay/types';

import {runTransactional} from '../db/withTransaction.js';
import {query as defaultQuery} from '../db/query.js';
import {
  GET_RECIPE_DETAIL_SQL,
  buildRecipeOptions,
  deleteIngredientsByRecipeId,
  deleteInstructionsByRecipeId,
  deleteRecipeTagsByRecipeId,
  insertIngredients,
  insertInstructions,
  insertRecipe,
  linkTags,
  updateRecipe,
} from '../routes/recipes/queries.js';

import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';

type QueryFn = typeof defaultQuery;

type SaveRecipeFromInputOptions = {
  userId: string;
  input: RecipeInput;
  recipeId?: string;
};

export class RecipeNotFoundError extends Error {
  constructor() {
    super('Recipe not found');
    this.name = 'RecipeNotFoundError';
  }
}

const replaceChildren = async (
  recipeId: string,
  input: RecipeInput,
  queryFn: QueryFn,
) => {
  await deleteIngredientsByRecipeId(recipeId, queryFn);
  await deleteInstructionsByRecipeId(recipeId, queryFn);
  await deleteRecipeTagsByRecipeId(recipeId, queryFn);
  await insertIngredients(recipeId, input.ingredients, queryFn);
  await insertInstructions(recipeId, input.instructions, queryFn);
  await linkTags(recipeId, input.tagIds, queryFn);
};

const createRecipe = async (
  input: RecipeInput,
  userId: string,
  queryFn: QueryFn,
) => {
  const recipe = await insertRecipe(buildRecipeOptions(input, userId), queryFn);
  const recipeId = (recipe.rows[0] as {id: string}).id;
  await insertIngredients(recipeId, input.ingredients, queryFn);
  await insertInstructions(recipeId, input.instructions, queryFn);
  await linkTags(recipeId, input.tagIds, queryFn);
  return recipeId;
};

const updateExistingRecipe = async (
  recipeId: string,
  input: RecipeInput,
  userId: string,
  queryFn: QueryFn,
) => {
  const result = await updateRecipe(
    recipeId,
    buildRecipeOptions(input, userId),
    queryFn,
  );
  if (result.rowCount === 0) {
    throw new RecipeNotFoundError();
  }
  await replaceChildren(recipeId, input, queryFn);
  return recipeId;
};

const saveRecipe = async (
  opts: SaveRecipeFromInputOptions,
  queryFn: QueryFn,
) => {
  if (opts.recipeId) {
    return updateExistingRecipe(
      opts.recipeId,
      opts.input,
      opts.userId,
      queryFn,
    );
  }
  return createRecipe(opts.input, opts.userId, queryFn);
};

export const saveRecipeFromInput = async (
  opts: SaveRecipeFromInputOptions,
  queryFn: QueryFn,
): Promise<RecipeDetail> => {
  const recipeId = await runTransactional(queryFn, q => saveRecipe(opts, q));
  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, opts.userId]);
  const row = detail.rows[0];
  if (!row) {
    throw new RecipeNotFoundError();
  }
  return mapRowToRecipeDetail(
    row as Parameters<typeof mapRowToRecipeDetail>[0],
  );
};
