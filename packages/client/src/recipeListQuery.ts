import type {RecipeDetail} from '@eciperay/types';

import {queryKeys} from './queryKeys.js';

export const RECIPE_LIST_PAGE_SIZE = 20;

type ListRecipesParams = {search?: string; limit?: number; offset?: number};

type ListRecipesFn = (params?: ListRecipesParams) => Promise<RecipeDetail[]>;

export const getRecipeListNextPageParam = (
  lastPage: RecipeDetail[],
  allPages: RecipeDetail[][],
): number | undefined => {
  if (lastPage.length < RECIPE_LIST_PAGE_SIZE) {
    return undefined;
  }
  return allPages.flat().length;
};

export const recipeListInfiniteQueryOptions = (
  list: ListRecipesFn,
  search: string,
) => ({
  queryKey: queryKeys.recipes(search),
  queryFn: ({pageParam}: {pageParam: number}) =>
    list({
      search: search || undefined,
      limit: RECIPE_LIST_PAGE_SIZE,
      offset: pageParam,
    }),
  initialPageParam: 0,
  getNextPageParam: getRecipeListNextPageParam,
});
