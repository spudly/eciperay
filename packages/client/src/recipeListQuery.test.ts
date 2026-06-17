import type {RecipeDetail} from '@eciperay/types';

import {makeRecipeDetail} from './test/fixtures/recipe.js';
import {
  getRecipeListNextPageParam,
  RECIPE_LIST_PAGE_SIZE,
  recipeListInfiniteQueryOptions,
} from './recipeListQuery.js';

const makeListItem = (id: string): RecipeDetail =>
  makeRecipeDetail({id, title: `Recipe ${id}`});

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
    const options = recipeListInfiniteQueryOptions(list, 'pasta');
    expect(options.queryKey).toEqual(['recipes', {search: 'pasta'}]);
    await options.queryFn({pageParam: 40});
    expect(list).toHaveBeenCalledWith({
      search: 'pasta',
      limit: RECIPE_LIST_PAGE_SIZE,
      offset: 40,
    });
  });

  test('omits search from the request when the query is empty', async () => {
    const list = jest.fn().mockResolvedValue([]);
    const options = recipeListInfiniteQueryOptions(list, '');
    await options.queryFn({pageParam: 0});
    expect(list).toHaveBeenCalledWith({
      limit: RECIPE_LIST_PAGE_SIZE,
      offset: 0,
    });
  });
});
