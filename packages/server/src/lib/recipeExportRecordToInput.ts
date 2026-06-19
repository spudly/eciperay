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
  sourceUrl: record.sourceUrl,
  ingredients: record.ingredients,
  instructions: record.instructions,
  tagIds,
});
