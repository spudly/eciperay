import {
  buildRecipeShareUrl,
  buildShareText,
  WEB_APP_BASE_URL,
} from '@eciperay/client';
import {Share} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

type ShareRecipeOptions = {shareToken?: string};

export const shareRecipe = (
  recipe: RecipeDetail,
  options: ShareRecipeOptions = {},
) => {
  const url = buildRecipeShareUrl(WEB_APP_BASE_URL, recipe, options.shareToken);

  return Share.share({
    title: recipe.title,
    message: buildShareText(recipe),
    url,
  });
};
