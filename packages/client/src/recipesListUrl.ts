export type RecipeListParams = {
  search?: string;
  limit?: number;
  offset?: number;
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
