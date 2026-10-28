import {
  buildRecipePermalink,
  formatRecipeListSubtitle,
  makeRecipeDetail,
  WEB_APP_BASE_URL,
} from '@eciperay/client';
import {Linking} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

import {ThumbnailListCard} from './ui/ThumbnailListCard';

// The card subtitle is formatted by the shared formatRecipeListSubtitle
// in @eciperay/client (#278); the Shared-with-me host imports it from
// there too — see the web mirror's parity note.
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
      subtitle={formatRecipeListSubtitle(recipe)}
      onPress={openRecipe}
    />
  );
};
