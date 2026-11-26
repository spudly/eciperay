import type {
  RecipeDetail,
  RecipeExportImage,
  RecipeExportRecord,
} from '@eciperay/types';

export const recipeDetailToExportRecord = (
  detail: RecipeDetail,
  image?: RecipeExportImage,
  // Tips live on the version, not RecipeDetail (#635); the caller reads
  // them from the detail row and passes them in.
  tips: readonly string[] = [],
): RecipeExportRecord => ({
  title: detail.title,
  description: detail.description,
  servings: detail.servings,
  prepTimeMin: detail.prepTimeMin,
  cookTimeMin: detail.cookTimeMin,
  starRating: null,
  sourceUrl: detail.sourceUrl,
  tips: [...tips],
  tags: detail.tags.map(({name, color}) => ({name, ...(color ? {color} : {})})),
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
  ...(image ? {image} : {}),
});
