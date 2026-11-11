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
  signal?: AbortSignal;
};

export const prepareImportedRecipeInput = async ({
  recipe,
  userId,
  queryFn,
  options = {},
  client = defaultAnthropic,
  signal,
}: PrepareImportedRecipeInputParams): Promise<RecipeInput> => {
  const availableTags = await listTagOptionsForUser(userId, queryFn);
  // The tag-options query cannot be cancelled, so it may resolve after
  // the caller's stage deadline: check the signal before tag selection
  // can start its Anthropic request (selectTagIdsForRecipe checks it
  // again immediately before the request).
  signal?.throwIfAborted();
  const tagIds = await selectTagIdsForRecipe(
    recipe,
    availableTags,
    client,
    signal,
  );
  return recipeImportToInput(recipe, {...options, tagIds});
};
