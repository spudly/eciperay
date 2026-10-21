import type {PublicRecipeDiscoveryItem, RecipeDetail} from '@eciperay/types';

import {assignDefined} from './assignDefined.js';
import {HOME_RECENT_RECIPE_COUNT} from './homeCopy.js';
import {queryKeys} from './queryKeys.js';
import {
  getRecentRecipeIds,
  removeRecipeView,
  type RecipeViewHistoryStorage,
} from './recipeViewHistory.js';
import type {RecipeListFilters, RecipeListParams} from './recipesListUrl.js';

export type {RecipeListFilters} from './recipesListUrl.js';

export const RECIPE_LIST_PAGE_SIZE = 20;

type ListRecipesFn = (params?: RecipeListParams) => Promise<RecipeDetail[]>;
type GetRecipeFn = (id: string) => Promise<RecipeDetail>;
type ListPublicRecipesFn = (
  params?: RecipeListParams,
) => Promise<PublicRecipeDiscoveryItem[]>;

export const getRecipeListNextPageParam = <T>(
  lastPage: T[],
  allPages: T[][],
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

const toListParams = (
  filters: RecipeListFilters,
  pageParam: number,
): RecipeListParams => {
  const params: RecipeListParams = {
    limit: RECIPE_LIST_PAGE_SIZE,
    offset: pageParam,
  };
  assignDefined(params, {
    status: filters.status,
    minCalories: filters.minCalories,
    maxCalories: filters.maxCalories,
    minProteinG: filters.minProteinG,
    maxProteinG: filters.maxProteinG,
    minSatiety: filters.minSatiety,
    maxSatiety: filters.maxSatiety,
    sort: filters.sort,
    sortDir: filters.sortDir,
  });
  if (filters.search) {
    params.search = filters.search;
  }
  if (filters.ingredient) {
    params.ingredient = filters.ingredient;
  }
  return params;
};

export const recipeListInfiniteQueryOptions = (
  list: ListRecipesFn,
  filters: RecipeListFilters = {},
) => ({
  queryKey: queryKeys.recipes(filters),
  queryFn: ({pageParam}: {pageParam: number}) =>
    list(toListParams(filters, pageParam)),
  initialPageParam: 0,
  getNextPageParam: getRecipeListNextPageParam,
});

export const RECIPE_FORM_OPTIONS_LIMIT = 100;

// Flat (non-paginated) recipe list for the meal / meal-plan form pickers.
// Uses its own query key — see queryKeys.recipeFormOptions for why sharing
// the infinite list's key crashes both consumers (#171, #172).
export const recipeFormOptionsQueryOptions = (list: ListRecipesFn) => ({
  queryKey: queryKeys.recipeFormOptions(),
  queryFn: () => list({limit: RECIPE_FORM_OPTIONS_LIMIT}),
});

export const sharedWithMeInfiniteQueryOptions = (
  listSharedWithMe: ListRecipesFn,
  filters: RecipeListFilters = {},
) => ({
  queryKey: queryKeys.sharedWithMe(filters),
  queryFn: ({pageParam}: {pageParam: number}) =>
    listSharedWithMe(toListParams(filters, pageParam)),
  initialPageParam: 0,
  getNextPageParam: getRecipeListNextPageParam,
});

export const publicRecipeDiscoveryInfiniteQueryOptions = (
  listPublic: ListPublicRecipesFn,
  filters: RecipeListFilters = {},
) => ({
  queryKey: queryKeys.publicRecipeDiscovery(filters),
  queryFn: ({pageParam}: {pageParam: number}) =>
    listPublic({
      ...toListParams(filters, pageParam),
      sort: filters.sort ?? 'newest',
    }),
  initialPageParam: 0,
  getNextPageParam: getRecipeListNextPageParam,
});
