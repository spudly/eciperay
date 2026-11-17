import {buildRecipeShareUrl, WEB_APP_BASE_URL} from '@eciperay/client';
import {Share} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

type ShareRecipeOptions = {shareToken?: string};

export const shareRecipe = (
  recipe: RecipeDetail,
  options: ShareRecipeOptions = {},
) => {
  // Share a link, never the recipe text (#534): on Android the message is
  // what actually gets shared, so the message is the Eciperay permalink
  // (carrying the share token when supplied).
  const url = buildRecipeShareUrl(WEB_APP_BASE_URL, recipe, options.shareToken);

  return Share.share({title: recipe.title, message: url, url});
};
