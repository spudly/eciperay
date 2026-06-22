import type {RecipeDevelopmentStatus} from '@eciperay/types';

export type RecipeListParams = {
  search?: string;
  developmentStatus?: RecipeDevelopmentStatus;
  limit?: number;
  offset?: number;
};

export type PublicRecipeDiscoveryParams = RecipeListParams & {
  sort?: 'newest' | 'rating';
};

export const LIST_PAGE_SIZE = 100;

export const buildListUrl = (params?: RecipeListParams) => {
  if (!params) {
    return '/recipes';
  }
  const search = new URLSearchParams();
  if (params.search) {
    search.set('search', params.search);
  }
  if (params.developmentStatus) {
    search.set('developmentStatus', params.developmentStatus);
  }
  if (params.limit !== undefined) {
    search.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set('offset', String(params.offset));
  }
  const query = search.toString();
  if (query.length === 0) {
    return '/recipes';
  }
  return `/recipes?${query}`;
};

export const buildSharedWithMeUrl = (
  params?: Omit<RecipeListParams, 'search'>,
) => {
  if (!params) {
    return '/recipes/shared-with-me';
  }
  const search = new URLSearchParams();
  if (params.limit !== undefined) {
    search.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set('offset', String(params.offset));
  }
  const query = search.toString();
  if (query.length === 0) {
    return '/recipes/shared-with-me';
  }
  return `/recipes/shared-with-me?${query}`;
};

export const buildPublicRecipesUrl = (params?: PublicRecipeDiscoveryParams) => {
  if (!params) {
    return '/public/recipes';
  }
  const search = new URLSearchParams();
  if (params.search) {
    search.set('search', params.search);
  }
  if (params.limit !== undefined) {
    search.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set('offset', String(params.offset));
  }
  if (params.sort) {
    search.set('sort', params.sort);
  }
  const query = search.toString();
  if (query.length === 0) {
    return '/public/recipes';
  }
  return `/public/recipes?${query}`;
};
