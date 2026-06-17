import {buildShareText} from '@eciperay/client';
import type {RecipeDetail} from '@eciperay/types';

export type ShareRecipeResult = 'shared' | 'copied';

const recipePageUrl = (recipe: RecipeDetail) =>
  `${window.location.origin}/recipes/${recipe.id}`;

export const shareRecipe = async (
  recipe: RecipeDetail,
): Promise<ShareRecipeResult> => {
  const text = buildShareText(recipe);
  const url = recipe.sourceUrl ?? recipePageUrl(recipe);

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({title: recipe.title, text, url});
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
    }
  }

  await navigator.clipboard.writeText(
    recipe.sourceUrl
      ? `${text}\n\n${url}`
      : `${text}\n\n${recipePageUrl(recipe)}`,
  );
  return 'copied';
};
