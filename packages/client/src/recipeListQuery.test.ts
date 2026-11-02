import type {RecipeDetail} from '@eciperay/types';

import {makeRecipeDetail} from './test/fixtures/recipe.js';
import {
  getRecipeListNextPageParam,
  homeRecentlyViewedRecipesQueryOptions,
  publicRecipeDiscoveryInfiniteQueryOptions,
  RECIPE_FORM_SEARCH_LIMIT,
  RECIPE_LIST_PAGE_SIZE,
  recipeFormSearchQueryOptions,
  recipeListInfiniteQueryOptions,
  sharedWithMeInfiniteQueryOptions,
} from './recipeListQuery.js';
import type {RecipeViewHistoryStorage} from './recipeViewHistory.js';
import {recordRecipeView, getRecentRecipeIds} from './recipeViewHistory.js';

const makeListItem = (id: string): RecipeDetail =>
  makeRecipeDetail({id, title: `Recipe ${id}`});

const emptyKeyFilters = {
  search: '',
  status: '',
  ingredient: '',
  minCalories: null,
  maxCalories: null,
  minProteinG: null,
  maxProteinG: null,
  minSatiety: null,
  maxSatiety: null,
  sort: 'newest',
  sortDir: 'desc',
};

describe('recipeListQuery', () => {
  test('returns the next offset when the last page is full', () => {
    const page = Array.from({length: RECIPE_LIST_PAGE_SIZE}, (_, index) =>
      makeListItem(String(index)),
    );
    expect(getRecipeListNextPageParam(page, [page])).toBe(
      RECIPE_LIST_PAGE_SIZE,
    );
  });

  test('returns undefined when the last page is partial', () => {
    const page = [makeListItem('1')];
    expect(getRecipeListNextPageParam(page, [page])).toBeUndefined();
  });

  test('builds infinite query options with paging params', async () => {
    const list = jest.fn().mockResolvedValue([makeListItem('1')]);
    const options = recipeListInfiniteQueryOptions(list, {search: 'pasta'});
    expect(options.queryKey).toEqual([
      'recipes',
      {...emptyKeyFilters, search: 'pasta'},
    ]);
    await options.queryFn({pageParam: 40});
    expect(list).toHaveBeenCalledWith({
      search: 'pasta',
      limit: RECIPE_LIST_PAGE_SIZE,
      offset: 40,
    });
  });

  test('omits search from the request when the query is empty', async () => {
    const list = jest.fn().mockResolvedValue([]);
    const options = recipeListInfiniteQueryOptions(list, {});
    await options.queryFn({pageParam: 0});
    expect(list).toHaveBeenCalledWith({
      limit: RECIPE_LIST_PAGE_SIZE,
      offset: 0,
    });
  });

  test('passes status filter to list requests', async () => {
    const list = jest.fn().mockResolvedValue([]);
    const options = recipeListInfiniteQueryOptions(list, {status: 'perfected'});
    expect(options.queryKey).toEqual([
      'recipes',
      {...emptyKeyFilters, status: 'perfected'},
    ]);
    await options.queryFn({pageParam: 0});
    expect(list).toHaveBeenCalledWith({
      status: 'perfected',
      limit: RECIPE_LIST_PAGE_SIZE,
      offset: 0,
    });
  });

  test('passes ingredient filter to list requests', async () => {
    const list = jest.fn().mockResolvedValue([]);
    const options = recipeListInfiniteQueryOptions(list, {
      ingredient: 'chicken',
    });
    await options.queryFn({pageParam: 0});
    expect(list).toHaveBeenCalledWith({
      ingredient: 'chicken',
      limit: RECIPE_LIST_PAGE_SIZE,
      offset: 0,
    });
  });

  test('builds form picker search on a key distinct from the infinite list', async () => {
    const list = jest.fn().mockResolvedValue([makeListItem('1')]);
    const options = recipeFormSearchQueryOptions(list, 'pasta');
    expect(options.queryKey).toEqual([
      'recipes',
      'form-search',
      {search: 'pasta', sort: 'newest', sortDir: 'desc'},
    ]);
    // Regression (#171, #172): the default-filter infinite list key
    // normalizes to {sort: 'newest', sortDir: 'desc'} — the picker key must
    // never equal it, or each query reads the other's cached data shape.
    const infiniteKey = recipeListInfiniteQueryOptions(list, {}).queryKey;
    expect(options.queryKey).not.toEqual(infiniteKey);
    const results = await options.queryFn();
    expect(results).toEqual([makeListItem('1')]);
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith({
      search: 'pasta',
      sort: 'newest',
      sortDir: 'desc',
      limit: RECIPE_FORM_SEARCH_LIMIT,
      offset: 0,
    });
    expect(RECIPE_FORM_SEARCH_LIMIT).toBe(20);
  });

  test('form picker search trims the text and omits an empty search', async () => {
    const list = jest.fn().mockResolvedValue([]);
    const options = recipeFormSearchQueryOptions(list, '  soup  ');
    expect(options.queryKey).toEqual([
      'recipes',
      'form-search',
      {search: 'soup', sort: 'newest', sortDir: 'desc'},
    ]);
    await options.queryFn();
    expect(list).toHaveBeenCalledWith({
      search: 'soup',
      sort: 'newest',
      sortDir: 'desc',
      limit: RECIPE_FORM_SEARCH_LIMIT,
      offset: 0,
    });

    const empty = recipeFormSearchQueryOptions(list, '   ');
    await empty.queryFn();
    expect(list).toHaveBeenLastCalledWith({
      sort: 'newest',
      sortDir: 'desc',
      limit: RECIPE_FORM_SEARCH_LIMIT,
      offset: 0,
    });
  });

  test('form picker search reaches recipes past the old first-100 cap (#359)', async () => {
    // The old picker fetched the library in one capped request; the search
    // asks the server for matches instead, so a recipe that only exists
    // beyond position 100 is returned as a search result.
    const deepRecipe = makeListItem('201');
    const list = jest.fn().mockResolvedValue([deepRecipe]);
    const options = recipeFormSearchQueryOptions(list, 'Recipe 201');
    const results = await options.queryFn();
    expect(results.map(recipe => recipe.id)).toEqual(['201']);
    expect(list).toHaveBeenCalledWith({
      search: 'Recipe 201',
      sort: 'newest',
      sortDir: 'desc',
      limit: RECIPE_FORM_SEARCH_LIMIT,
      offset: 0,
    });
  });

  test('builds shared-with-me infinite query options with paging params', async () => {
    const listSharedWithMe = jest.fn().mockResolvedValue([makeListItem('1')]);
    const options = sharedWithMeInfiniteQueryOptions(listSharedWithMe, {
      sort: 'newest',
      sortDir: 'desc',
    });
    expect(options.queryKey).toEqual([
      'sharedWithMe',
      {...emptyKeyFilters, sort: 'newest', sortDir: 'desc'},
    ]);
    await options.queryFn({pageParam: 20});
    expect(listSharedWithMe).toHaveBeenCalledWith({
      limit: RECIPE_LIST_PAGE_SIZE,
      offset: 20,
      sort: 'newest',
      sortDir: 'desc',
    });
  });

  test('builds public discovery infinite query options with paging params', async () => {
    const listPublic = jest.fn().mockResolvedValue([{id: 'public-1'}]);
    const options = publicRecipeDiscoveryInfiniteQueryOptions(listPublic, {
      search: 'curry',
      sort: 'rating',
    });
    expect(options.queryKey).toEqual([
      'publicRecipeDiscovery',
      {...emptyKeyFilters, search: 'curry', sort: 'rating'},
    ]);
    await options.queryFn({pageParam: 20});
    expect(listPublic).toHaveBeenCalledWith({
      search: 'curry',
      sort: 'rating',
      limit: RECIPE_LIST_PAGE_SIZE,
      offset: 20,
    });
  });

  test('omits search from public discovery when the query is empty', async () => {
    const listPublic = jest.fn().mockResolvedValue([]);
    const options = publicRecipeDiscoveryInfiniteQueryOptions(listPublic, {});
    await options.queryFn({pageParam: 0});
    expect(listPublic).toHaveBeenCalledWith({
      sort: 'newest',
      limit: RECIPE_LIST_PAGE_SIZE,
      offset: 0,
    });
  });

  test('builds home recently viewed query options from local history', async () => {
    const storage: RecipeViewHistoryStorage = {
      getItem: async () =>
        JSON.stringify([
          {recipeId: 'recipe-b', viewedAt: 2},
          {recipeId: 'recipe-a', viewedAt: 1},
        ]),
      setItem: async () => {},
      removeItem: async () => {},
    };
    const getRecipe = jest
      .fn()
      .mockImplementation(async (id: string) => makeListItem(id));
    const options = homeRecentlyViewedRecipesQueryOptions(getRecipe, storage);

    expect(options.queryKey).toEqual([
      'recipes',
      {search: 'home-recently-viewed', status: ''},
    ]);
    const recipes = await options.queryFn();
    expect(getRecipe).toHaveBeenCalledWith('recipe-b');
    expect(getRecipe).toHaveBeenCalledWith('recipe-a');
    expect(recipes.map(recipe => recipe.id)).toEqual(['recipe-b', 'recipe-a']);
  });

  test('removes missing recipes from local history when fetch fails', async () => {
    const storage = {
      map: new Map<string, string>(),
      getItem(key: string) {
        return this.map.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.map.set(key, value);
      },
      removeItem(key: string) {
        this.map.delete(key);
      },
    };
    await recordRecipeView(storage, 'recipe-a');
    await recordRecipeView(storage, 'recipe-b');

    const getRecipe = jest.fn().mockImplementation(async (id: string) => {
      if (id === 'recipe-b') {
        throw new Error('not found');
      }
      return makeListItem(id);
    });
    const options = homeRecentlyViewedRecipesQueryOptions(getRecipe, storage);
    const recipes = await options.queryFn();

    expect(recipes.map(recipe => recipe.id)).toEqual(['recipe-a']);
    expect(await getRecentRecipeIds(storage, 5)).toEqual(['recipe-a']);
  });

  test('tolerates history cleanup failures when a fetch fails', async () => {
    const storage: RecipeViewHistoryStorage = {
      getItem: async () =>
        JSON.stringify([
          {recipeId: 'recipe-b', viewedAt: 2},
          {recipeId: 'recipe-a', viewedAt: 1},
        ]),
      setItem: async () => {
        throw new Error('storage unavailable');
      },
      removeItem: async () => {},
    };
    const getRecipe = jest.fn().mockImplementation(async (id: string) => {
      if (id === 'recipe-b') {
        throw new Error('not found');
      }
      return makeListItem(id);
    });
    const options = homeRecentlyViewedRecipesQueryOptions(getRecipe, storage);

    // The failed prune must not reject the query: the surviving
    // recipe still resolves and the missing one is simply omitted.
    const recipes = await options.queryFn();
    expect(recipes.map(recipe => recipe.id)).toEqual(['recipe-a']);
  });
});
