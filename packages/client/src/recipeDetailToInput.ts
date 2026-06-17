import type {RecipeDetail, RecipeInput} from '@eciperay/types';

export const recipeDetailToInput = (detail: RecipeDetail): RecipeInput => ({
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
    .map(({sortOrder, name, quantity, unit, notes, isOptional}) => ({
      sortOrder,
      name,
      quantity,
      unit,
      notes,
      isOptional,
    })),
  instructions: [...detail.instructions]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map(({stepNumber, body}) => ({stepNumber, body})),
  tagIds: detail.tags.map(tag => tag.id),
});
