import type {RecipeExportRecord, RecipeInput} from '@eciperay/types';

export const recipeExportRecordToInput = (
  record: RecipeExportRecord,
  tagIds: string[],
): RecipeInput => ({
  title: record.title,
  description: record.description,
  servings: record.servings,
  prepTimeMin: record.prepTimeMin,
  cookTimeMin: record.cookTimeMin,
  starRating: record.starRating,
  sourceUrl: record.sourceUrl,
  ingredients: record.ingredients,
  instructions: record.instructions,
  tagIds,
});
