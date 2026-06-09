import type {RecipeImport, RecipeInput} from '@recipoo/types';

export class RecipeImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecipeImportError';
  }
}

type RecipeImportOptions = {sourceUrl?: string | null};

export const recipeImportToInput = (
  recipe: RecipeImport,
  {sourceUrl}: RecipeImportOptions = {},
): RecipeInput => {
  if (recipe.servings === null) {
    throw new RecipeImportError('servings is required');
  }
  return {
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    imageUrl: null,
    starRating: null,
    sourceUrl: recipe.sourceUrl ?? sourceUrl ?? null,
    ingredients: recipe.ingredients.map((ing, index) => ({
      ...ing,
      sortOrder: index,
    })),
    instructions: recipe.instructions.map((ins, index) => ({
      ...ins,
      stepNumber: index + 1,
    })),
    tagIds: [],
  };
};
