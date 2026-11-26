import type {RecipeDetail, RecipeVersionDetail} from '@eciperay/types';
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

// Web's fixture extends the shared @eciperay/client fixture (#679): a second
// ingredient and instruction, and a tag with no owner. Host overrides replace
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
        isOptional: true,
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
    tags: shared.tags.map((tag) => ({...tag, userId: null})),
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
