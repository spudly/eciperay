import type {RecipeListFilters} from './recipesListUrl.js';

const normalizeFilters = (filters: RecipeListFilters = {}) => ({
  search: filters.search ?? '',
  status: filters.status ?? '',
  ingredient: filters.ingredient ?? '',
  minCalories: filters.minCalories ?? null,
  maxCalories: filters.maxCalories ?? null,
  minProteinG: filters.minProteinG ?? null,
  maxProteinG: filters.maxProteinG ?? null,
  minSatiety: filters.minSatiety ?? null,
  maxSatiety: filters.maxSatiety ?? null,
  sort: filters.sort ?? 'newest',
  sortDir: filters.sortDir ?? 'desc',
});

export const queryKeys = {
  recipeLists: () => ['recipes'] as const,
  recipes: (filters: RecipeListFilters | string = {}, status = '') => {
    if (typeof filters === 'string') {
      return ['recipes', {search: filters, status}] as const;
    }
    return ['recipes', normalizeFilters(filters)] as const;
  },
  // The meal / meal-plan form recipe picker caches a flat RecipeDetail[]
  // (the full library, fetched in pages — #359), while the recipe list
  // caches an infinite-query
  // {pages, pageParams} shape under queryKeys.recipes(filters). The two
  // MUST NOT share a key: the default list filters normalize to exactly
  // {sort: 'newest', sortDir: 'desc'}, so when the picker used
  // queryKeys.recipes({sort: 'newest', sortDir: 'desc'}) each consumer read
  // the other's cached shape and crashed (#171, #172). This key stays under
  // the ['recipes'] prefix so invalidateRecipeQueries still refreshes it.
  recipeFormOptions: () =>
    ['recipes', 'form-options', {sort: 'newest', sortDir: 'desc'}] as const,
  recipe: (id: string) => ['recipe', id] as const,
  versions: (recipeId: string) => ['versions', recipeId] as const,
  version: (recipeId: string, versionId: string) =>
    ['version', recipeId, versionId] as const,
  cookLogs: (recipeId: string, versionId: string) =>
    ['cookLogs', recipeId, versionId] as const,
  nutrition: (id: string) => ['nutrition', id] as const,
  tags: () => ['tags'] as const,
  publicRecipe: (id: string, slug?: string, shareToken?: string) =>
    [
      'publicRecipe',
      id,
      {slug: slug ?? '', shareToken: shareToken ?? ''},
    ] as const,
  sharedWithMe: (filters: RecipeListFilters = {}) =>
    ['sharedWithMe', normalizeFilters(filters)] as const,
  recipeComments: (recipeId: string, shareToken?: string) =>
    ['recipeComments', recipeId, {shareToken: shareToken ?? ''}] as const,
  publicRecipeDiscovery: (
    filters: RecipeListFilters | string = {},
    sort = 'newest',
  ) => {
    if (typeof filters === 'string') {
      return [
        'publicRecipeDiscovery',
        normalizeFilters({
          search: filters,
          sort: sort as RecipeListFilters['sort'],
        }),
      ] as const;
    }
    return ['publicRecipeDiscovery', normalizeFilters(filters)] as const;
  },
  meals: () => ['meals'] as const,
  meal: (id: string) => ['meal', id] as const,
  mealCookPlan: (id: string) => ['mealCookPlan', id] as const,
  mealPlans: () => ['mealPlans'] as const,
  mealPlan: (id: string) => ['mealPlan', id] as const,
  mealPlanShoppingList: (id: string) => ['mealPlanShoppingList', id] as const,
  nutritionGoals: () => ['nutritionGoals'] as const,
  personalAccessTokens: () => ['personalAccessTokens'] as const,
  entitlement: (userId: string) => ['entitlement', userId] as const,
};
