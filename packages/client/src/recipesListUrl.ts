export type RecipeListParams = {limit?: number; offset?: number};

export const LIST_PAGE_SIZE = 100;

export const buildListUrl = (params?: RecipeListParams) => {
  const search = new URLSearchParams();
  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit));
  }
  if (params?.offset !== undefined) {
    search.set('offset', String(params.offset));
  }
  const query = search.toString();
  if (query.length === 0) {
    return '/recipes';
  }
  return `/recipes?${query}`;
};
