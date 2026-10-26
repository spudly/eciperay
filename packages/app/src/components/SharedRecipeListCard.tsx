import {
  buildRecipePermalink,
  formatRecipeListMeta,
  makeRecipeDetail,
  WEB_APP_BASE_URL,
} from '@eciperay/client';
import {Linking} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

import {ThumbnailListCard} from './ui/ThumbnailListCard';

export const formatRecipeSubtitle = (recipe: RecipeDetail) =>
  `${recipe.servings} servings${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${formatRecipeListMeta(recipe)}`;

type Props = {recipe: RecipeDetail};

export const SharedRecipeListCard = ({recipe}: Props) => {
  const openRecipe = () => {
    const url = buildRecipePermalink(WEB_APP_BASE_URL, recipe);
    void Linking.openURL(url);
  };

  return (
    <ThumbnailListCard
      imageUrl={recipe.imageUrl}
      title={recipe.title}
      subtitle={formatRecipeSubtitle(recipe)}
      onPress={openRecipe}
    />
  );
};
