import type {RecipeDetail} from '@eciperay/types';
import {
  formatRecipeListMeta,
  makeRecipeDetail,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {Text, TouchableOpacity} from 'react-native';

import {ThumbnailListCard} from './ui/ThumbnailListCard';

const formatRecipeSubtitle = (recipe: RecipeDetail) =>
  `${recipe.servings} servings${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${formatRecipeListMeta(recipe)}`;

type Props = {recipe: RecipeDetail; onPress: () => void; onDelete: () => void};

export const RecipeListCard = ({recipe, onPress, onDelete}: Props) => (
  <ThumbnailListCard
    imageUrl={recipe.imageUrl}
    title={recipe.title}
    subtitle={formatRecipeSubtitle(recipe)}
    onPress={onPress}
    trailing={
      <TouchableOpacity
        className="ms-3 rounded-lg bg-red-50 px-3 py-1"
        onPress={onDelete}
      >
        <Text className="text-sm text-red-600">Delete</Text>
      </TouchableOpacity>
    }
  />
);

if (__DEV__) {
  const recipeListCardDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <RecipeListCard
        recipe={makeRecipeDetail()}
        onPress={() => {
          void 0;
        }}
        onDelete={() => {
          void 0;
        }}
      />
    </Frame>
  );
  RecipeListCard.demo = recipeListCardDemo;
}
