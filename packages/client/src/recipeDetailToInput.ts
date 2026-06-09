import type {RecipeDetail, RecipeInput} from '@recipoo/types';

export const recipeDetailToInput = (detail: RecipeDetail): RecipeInput => ({
  title: detail.title,
  description: detail.description,
  servings: detail.servings,
  prepTimeMin: detail.prepTimeMin,
  cookTimeMin: detail.cookTimeMin,
  imageUrl: detail.imageUrl,
  starRating: detail.starRating,
  sourceUrl: detail.sourceUrl,
  ingredients: detail.ingredients.map(
    ({sortOrder, name, quantity, unit, notes, isOptional}) => ({
      sortOrder,
      name,
      quantity,
      unit,
      notes,
      isOptional,
    }),
  ),
  instructions: detail.instructions.map(({stepNumber, body}) => ({
    stepNumber,
    body,
  })),
  tagIds: detail.tags.map(tag => tag.id),
});
