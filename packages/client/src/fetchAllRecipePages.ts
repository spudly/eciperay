import type {RecipeDetail} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';
import {buildListUrl, LIST_PAGE_SIZE} from './recipesListUrl.js';

export const fetchAllRecipePages = async (client: ApiClient) => {
  const all: RecipeDetail[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const page = await client.fetch<RecipeDetail[]>(
      buildListUrl({limit: LIST_PAGE_SIZE, offset}),
    );
    all.push(...page);
    hasMore = page.length === LIST_PAGE_SIZE;
    offset += LIST_PAGE_SIZE;
  }
  return all;
};
