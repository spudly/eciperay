import type {RecipeDetail} from '@eciperay/types';

import {fetchAllRecipePages} from './fetchAllRecipePages.js';
import {LIST_PAGE_SIZE} from './recipesListUrl.js';
import {makeRecipeDetail} from './test/fixtures/recipe.js';

const makePage = (count: number, start = 0): RecipeDetail[] =>
  Array.from({length: count}, (_, index) =>
    makeRecipeDetail({
      id: `recipe-${start + index}`,
      title: `Recipe ${start + index}`,
    }),
  );

describe('fetchAllRecipePages', () => {
  test('returns a single page when fewer than page size', async () => {
    const page = makePage(3);
    const fetch = jest.fn().mockResolvedValue(page);

    await expect(fetchAllRecipePages({fetch})).resolves.toEqual(page);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `/recipes?limit=${LIST_PAGE_SIZE}&offset=0`,
    );
  });

  test('fetches additional pages until a short page is returned', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(makePage(LIST_PAGE_SIZE, 0))
      .mockResolvedValueOnce(makePage(25, LIST_PAGE_SIZE));

    const result = await fetchAllRecipePages({fetch});

    expect(result).toHaveLength(LIST_PAGE_SIZE + 25);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `/recipes?limit=${LIST_PAGE_SIZE}&offset=0`,
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `/recipes?limit=${LIST_PAGE_SIZE}&offset=${LIST_PAGE_SIZE}`,
    );
  });
});
