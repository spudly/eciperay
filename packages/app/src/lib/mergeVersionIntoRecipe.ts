import type {RecipeDetail, RecipeVersionDetail} from '@eciperay/types';

export const mergeVersionIntoRecipe = (
  recipe: RecipeDetail,
  version: RecipeVersionDetail,
): RecipeDetail => ({
  ...recipe,
  title: version.title,
  description: version.description,
  servings: version.servings,
  prepTimeMin: version.prepTimeMin,
  cookTimeMin: version.cookTimeMin,
  imageUrl: version.imageUrl,
  sourceUrl: version.sourceUrl,
  versionId: version.id,
  versionNumber: version.versionNumber,
  createdVia: version.createdVia,
  ingredients: version.ingredients,
  instructions: version.instructions,
  tags: version.tags,
});
