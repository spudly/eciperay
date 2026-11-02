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
        // Pruning a missing recipe from history is best-effort: a
        // storage write failure must not reject the whole query and
        // leave the (already gone) recipe's card in the cached list.
        await removeRecipeView(storage, id).catch(() => undefined);
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

/**
 * Page size for one form-picker search request. The picker is a search
 * autocomplete (#359, @spudly/ui 2.0.0): the host runs this server-side search
 * for the typed text and shows the matches — it no longer renders the whole
 * library, so the old single-request `limit: 100` cap (recipes beyond the first
 * 100 could never be added to a meal or meal plan) is gone by construction: any
 * recipe is reachable by searching for it, however large the library is. A
 * single page is NOT enough on its own, though: the server's search is a title
 * substring match ordered newest-first, so a recipe whose title is contained in
 * more than a page of newer titles (an older "Soup" behind 20 newer "… Soup …"
 * titles) would sit past the first page even when its complete title is typed.
 * The query below therefore collects EVERY matching page, so every match is
 * reachable.
 */
export const RECIPE_FORM_SEARCH_LIMIT = 20;

// All matching pages of server-side recipe search results for the meal /
// meal-plan form pickers, ordered newest-first with the list endpoint's
// total-order tie-breaker (updated_at desc, id) so paging cannot skip or
// duplicate a recipe and the order is deterministic. Uses its own query
// key — see queryKeys.recipeFormSearch for why sharing the infinite
// list's key crashes both consumers (#171, #172).
export const recipeFormSearchQueryOptions = (
  list: ListRecipesFn,
  searchText: string,
) => {
  const search = searchText.trim();
  return {
    queryKey: queryKeys.recipeFormSearch(search),
    queryFn: async (): Promise<RecipeDetail[]> => {
      const results: RecipeDetail[] = [];
      let offset = 0;
      for (;;) {
        const page = await list({
          ...(search ? {search} : {}),
          sort: 'newest',
          sortDir: 'desc',
          limit: RECIPE_FORM_SEARCH_LIMIT,
          offset,
        });
        results.push(...page);
        if (page.length < RECIPE_FORM_SEARCH_LIMIT) {
          return results;
        }
        offset += page.length;
      }
    },
  };
};

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
