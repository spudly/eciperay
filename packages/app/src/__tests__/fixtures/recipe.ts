import type {
  CookLog,
  RecipeDetail,
  RecipeVersionDetail,
  RecipeVersionSummary,
} from '@eciperay/types';

export const VERSION_ID = 'version-uuid-1';

export const makeRecipeDetail = (
  overrides: Partial<RecipeDetail> = {},
): RecipeDetail => ({
  id: 'recipe-uuid-1',
  userId: 'user-uuid-1',
  lifecycleStatus: 'evolving',
  versionId: VERSION_ID,
  versionNumber: 1,
  title: 'Test Recipe',
  description: 'A test recipe',
  servings: 4,
  prepTimeMin: 15,
  cookTimeMin: 30,
  imageUrl: null,
  sourceUrl: 'https://example.com',
  createdVia: 'manual',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ingredients: [
    {
      id: 'i-1',
      recipeVersionId: VERSION_ID,
      sortOrder: 0,
      name: 'Flour',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    },
    {
      id: 'i-2',
      recipeVersionId: VERSION_ID,
      sortOrder: 1,
      name: 'Salt',
      quantity: null,
      unit: null,
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [
    {
      id: 'ins-1',
      recipeVersionId: VERSION_ID,
      stepNumber: 1,
      body: 'Mix dry ingredients',
    },
    {
      id: 'ins-2',
      recipeVersionId: VERSION_ID,
      stepNumber: 2,
      body: 'Bake at 350°F',
    },
  ],
  tags: [],
  ...overrides,
});

export const makeRecipeVersionSummary = (
  overrides: Partial<RecipeVersionSummary> = {},
): RecipeVersionSummary => ({
  id: VERSION_ID,
  recipeId: 'recipe-uuid-1',
  versionNumber: 1,
  title: 'Test Recipe',
  derivedRole: 'active',
  cookLogCount: 0,
  createdVia: 'manual',
  changeSummary: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

export const makeRecipeVersionDetail = (
  overrides: Partial<RecipeVersionDetail> = {},
): RecipeVersionDetail => {
  const recipe = makeRecipeDetail();
  return {
    ...makeRecipeVersionSummary(),
    description: recipe.description,
    servings: recipe.servings,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl,
    derivedFromVersionId: null,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    tags: recipe.tags,
    ...overrides,
  };
};

export const makeCookLog = (overrides: Partial<CookLog> = {}): CookLog => ({
  id: 'cook-log-1',
  recipeVersionId: VERSION_ID,
  userId: 'user-uuid-1',
  cookedAt: '2024-01-15T12:00:00.000Z',
  authorStarRating: 4,
  notes: 'Turned out great',
  createdAt: '2024-01-15T12:00:00.000Z',
  ...overrides,
});
