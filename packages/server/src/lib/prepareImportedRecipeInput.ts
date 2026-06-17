import type {RecipeImport, RecipeInput} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {anthropic as defaultAnthropic} from './anthropic.js';
import {
  recipeImportToInput,
  type RecipeImportOptions,
} from './recipeImportToInput.js';
import {selectTagIdsForRecipe} from './selectTagsForRecipe.js';
import {listTagOptionsForUser} from './tagQueries.js';

type QueryFn = typeof defaultQuery;
type AnthropicClient = typeof defaultAnthropic;

type PrepareImportedRecipeInputParams = {
  recipe: RecipeImport;
  userId: string;
  queryFn: QueryFn;
  options?: RecipeImportOptions;
  client?: AnthropicClient;
};

export const prepareImportedRecipeInput = async ({
  recipe,
  userId,
  queryFn,
  options = {},
  client = defaultAnthropic,
}: PrepareImportedRecipeInputParams): Promise<RecipeInput> => {
  const availableTags = await listTagOptionsForUser(userId, queryFn);
  const tagIds = await selectTagIdsForRecipe(recipe, availableTags, client);
  return recipeImportToInput(recipe, {...options, tagIds});
};
