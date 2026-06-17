import type {RecipeDetail} from '@eciperay/types';

export const makeRecipeDetail = (
  overrides: Partial<RecipeDetail> = {},
): RecipeDetail => ({
  id: 'recipe-uuid-1',
  userId: 'user-uuid-1',
  title: 'Test Recipe',
  description: 'A test recipe',
  servings: 4,
  prepTimeMin: 15,
  cookTimeMin: 30,
  imageUrl: null,
  starRating: null,
  sourceUrl: 'https://example.com',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ingredients: [
    {
      id: 'i-1',
      recipeId: 'recipe-uuid-1',
      sortOrder: 0,
      name: 'Flour',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [
    {
      id: 'ins-1',
      recipeId: 'recipe-uuid-1',
      stepNumber: 1,
      body: 'Mix dry ingredients',
    },
  ],
  tags: [
    {
      id: 'tag-1',
      userId: 'user-uuid-1',
      name: 'Dinner',
      color: '#6366f1',
      isPreset: false,
    },
  ],
  ...overrides,
});
