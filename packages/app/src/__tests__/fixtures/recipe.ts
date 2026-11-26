import type {
  PublicRecipeDiscoveryItem,
  RecipeDetail,
  RecipeVersionDetail,
} from '@eciperay/types';
import {
  makeRecipeDetail as makeSharedRecipeDetail,
  makeRecipeVersionDetail as makeSharedRecipeVersionDetail,
  VERSION_ID,
} from '@eciperay/client/test/fixtures/recipe';

export {
  makeCookLog,
  makeRecipeVersionSummary,
  VERSION_ID,
} from '@eciperay/client/test/fixtures/recipe';

// The app's fixture extends the shared @eciperay/client fixture (#679): a
// second ingredient and instruction, and no tags. Host overrides replace
// these extension defaults wholesale, exactly as the old full copy behaved.
const shared = makeSharedRecipeDetail();

export const makeRecipeDetail = (
  overrides: Partial<RecipeDetail> = {},
): RecipeDetail =>
  makeSharedRecipeDetail({
    ingredients: [
      ...shared.ingredients,
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
      ...shared.instructions,
      {
        id: 'ins-2',
        recipeVersionId: VERSION_ID,
        stepNumber: 2,
        body: 'Bake at 350°F',
        estimatedDurationMin: null,
        ingredientReferences: [],
      },
    ],
    tags: [],
    ...overrides,
  });

export const makeRecipeVersionDetail = (
  overrides: Partial<RecipeVersionDetail> = {},
): RecipeVersionDetail => {
  const recipe = makeRecipeDetail();
  return makeSharedRecipeVersionDetail({
    description: recipe.description,
    servings: recipe.servings,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    tags: recipe.tags,
    ...overrides,
  });
};

export const makePublicRecipeDiscoveryItem = (
  overrides: Partial<PublicRecipeDiscoveryItem> = {},
): PublicRecipeDiscoveryItem => ({
  id: 'public-recipe-uuid-1',
  slug: 'public-test-recipe',
  title: 'Public Test Recipe',
  description: 'A public test recipe',
  servings: 4,
  prepTimeMin: 15,
  cookTimeMin: 30,
  imageUrl: null,
  visibility: 'public',
  authorDisplayName: 'Pat Public',
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: [],
  communityRating: null,
  satietyScore: null,
  nutritionStatus: null,
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  ...overrides,
});
