import type {RecipeDetail} from '@eciperay/types';

import {HOME_RECENT_RECIPE_COUNT} from './homeCopy.js';
import {queryKeys} from './queryKeys.js';
import {
  getRecentRecipeIds,
  removeRecipeView,
  type RecipeViewHistoryStorage,
} from './recipeViewHistory.js';

export const RECIPE_LIST_PAGE_SIZE = 20;

type ListRecipesParams = {search?: string; limit?: number; offset?: number};

type ListRecipesFn = (params?: ListRecipesParams) => Promise<RecipeDetail[]>;
type GetRecipeFn = (id: string) => Promise<RecipeDetail>;

export const getRecipeListNextPageParam = (
  lastPage: RecipeDetail[],
  allPages: RecipeDetail[][],
): number | undefined => {
  if (lastPage.length < RECIPE_LIST_PAGE_SIZE) {
    return undefined;
  }
  return allPages.flat().length;
};

export const homeRecentlyViewedRecipesQueryOptions = (
  getRecipe: GetRecipeFn,
  storage: RecipeViewHistoryStorage,
) => ({
  queryKey: queryKeys.recipes('home-recently-viewed'),
  queryFn: async (): Promise<RecipeDetail[]> => {
    const ids = await getRecentRecipeIds(storage, HOME_RECENT_RECIPE_COUNT);
    const recipes: RecipeDetail[] = [];

    for (const id of ids) {
      try {
        recipes.push(await getRecipe(id));
      } catch {
        await removeRecipeView(storage, id);
      }
    }

    return recipes;
  },
});

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
