import type {
  RecipeListSort,
  RecipeListSortDir,
  RecipeStatus,
} from '@eciperay/types';

import {setOptionalSearchParams} from './setOptionalSearchParams.js';

export type RecipeListParams = {
  search?: string;
  status?: RecipeStatus;
  ingredient?: string;
  minCalories?: number;
  maxCalories?: number;
  minProteinG?: number;
  maxProteinG?: number;
  minSatiety?: number;
  maxSatiety?: number;
  sort?: RecipeListSort;
  sortDir?: RecipeListSortDir;
  limit?: number;
  offset?: number;
};

export type RecipeListFilters = Omit<RecipeListParams, 'limit' | 'offset'>;

export type PublicRecipeDiscoveryParams = RecipeListParams;

export const LIST_PAGE_SIZE = 100;

const appendListParams = (
  search: URLSearchParams,
  params: RecipeListParams,
) => {
  setOptionalSearchParams(search, {
    search: params.search,
    status: params.status,
    ingredient: params.ingredient,
    minCalories: params.minCalories,
    maxCalories: params.maxCalories,
    minProteinG: params.minProteinG,
    maxProteinG: params.maxProteinG,
    minSatiety: params.minSatiety,
    maxSatiety: params.maxSatiety,
    sort: params.sort,
    sortDir: params.sortDir,
    limit: params.limit,
    offset: params.offset,
  });
};

const buildUrl = (path: string, params?: RecipeListParams) => {
  if (!params) {
    return path;
  }
  const search = new URLSearchParams();
  appendListParams(search, params);
  const query = search.toString();
  if (query.length === 0) {
    return path;
  }
  return `${path}?${query}`;
};

export const buildListUrl = (params?: RecipeListParams) =>
  buildUrl('/recipes', params);

export const buildSharedWithMeUrl = (params?: RecipeListParams) =>
  buildUrl('/recipes/shared-with-me', params);

export const buildPublicRecipesUrl = (params?: PublicRecipeDiscoveryParams) =>
  buildUrl('/public/recipes', params);
