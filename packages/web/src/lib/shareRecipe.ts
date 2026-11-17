import {buildRecipeShareUrl} from '@eciperay/client';
import type {RecipeDetail} from '@eciperay/types';

export type ShareRecipeResult = 'shared' | 'copied';

type ShareRecipeOptions = {shareToken?: string};

export const shareRecipe = async (
  recipe: RecipeDetail,
  options: ShareRecipeOptions = {},
): Promise<ShareRecipeResult> => {
  // Share a link, never the recipe text (#534): the payload is the title
  // plus the Eciperay permalink (carrying the share token when supplied).
  const url = buildRecipeShareUrl(
    window.location.origin,
    recipe,
    options.shareToken,
  );

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({title: recipe.title, url});
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
    }
  }

  await navigator.clipboard.writeText(url);
  return 'copied';
};
