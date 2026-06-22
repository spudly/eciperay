import {buildRecipeShareUrl, buildShareText} from '@eciperay/client';
import type {RecipeDetail} from '@eciperay/types';

export type ShareRecipeResult = 'shared' | 'copied';

type ShareRecipeOptions = {shareToken?: string};

export const shareRecipe = async (
  recipe: RecipeDetail,
  options: ShareRecipeOptions = {},
): Promise<ShareRecipeResult> => {
  const text = buildShareText(recipe);
  const url = buildRecipeShareUrl(
    window.location.origin,
    recipe,
    options.shareToken,
  );

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

  await navigator.clipboard.writeText(`${text}\n\n${url}`);
  return 'copied';
};
