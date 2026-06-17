import type {RecipeDetail} from '@eciperay/types';

import type {RecipeFormInitial} from './recipeFormRows.js';

export const recipeDetailToInput = (
  detail: RecipeDetail,
): RecipeFormInitial => ({
  title: detail.title,
  description: detail.description,
  servings: detail.servings,
  prepTimeMin: detail.prepTimeMin,
  cookTimeMin: detail.cookTimeMin,
  imageUrl: detail.imageUrl,
  starRating: detail.starRating,
  sourceUrl: detail.sourceUrl,
  ingredients: [...detail.ingredients]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({id, sortOrder, name, quantity, unit, notes, isOptional}) => ({
      key: id,
      sortOrder,
      name,
      quantity,
      unit,
      notes,
      isOptional,
    })),
  instructions: [...detail.instructions]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map(({id, stepNumber, body}) => ({key: id, stepNumber, body})),
  tagIds: detail.tags.map(tag => tag.id),
});
