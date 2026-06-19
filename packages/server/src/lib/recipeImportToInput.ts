import type {RecipeImport, RecipeInput} from '@eciperay/types';

export class RecipeImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecipeImportError';
  }
}

export type RecipeImportOptions = {
  sourceUrl?: string | null;
  imageUrl?: string | null;
  tagIds?: string[];
};

export const recipeImportToInput = (
  recipe: RecipeImport,
  {sourceUrl, imageUrl, tagIds}: RecipeImportOptions = {},
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
    imageUrl: imageUrl ?? null,
    sourceUrl: recipe.sourceUrl ?? sourceUrl ?? null,
    ingredients: [...recipe.ingredients]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ing, index) => ({...ing, sortOrder: index})),
    instructions: [...recipe.instructions]
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((ins, index) => ({...ins, stepNumber: index + 1})),
    tagIds: tagIds ?? [],
  };
};
