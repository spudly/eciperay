import type {RecipeDetail} from '@eciperay/types';
import {formatRecipeListMeta, makeRecipeDetail} from '@eciperay/client';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';

import {ThumbnailListCard} from './ui/ThumbnailListCard.js';

const formatRecipeSubtitle = (recipe: RecipeDetail) =>
  `${recipe.servings} servings${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${formatRecipeListMeta(recipe)}`;

type RecipeListCardProps = {
  recipe: RecipeDetail;
  onDelete: (id: string) => void;
  onPress?: () => void;
};

export const RecipeListCard = ({
  recipe,
  onDelete,
  onPress,
}: RecipeListCardProps) => (
  <ThumbnailListCard
    imageUrl={recipe.imageUrl}
    title={recipe.title}
    subtitle={formatRecipeSubtitle(recipe)}
    onPress={onPress}
    linkTo={onPress ? undefined : `/recipes/${recipe.id}`}
    trailing={
      <button
        type="button"
        className="ms-3 rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600"
        onClick={() => {
          if (window.confirm(`Delete "${recipe.title}"?`)) {
            onDelete(recipe.id);
          }
        }}
      >
        Delete
      </button>
    }
  />
);

if (import.meta.env.DEV) {
  RecipeListCard.demo = function RecipeListCardDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    const mockRecipe = makeRecipeDetail();

    return (
      <Frame>
        <RecipeListCard
          recipe={mockRecipe}
          onDelete={() => {
            void 0;
          }}
        />
      </Frame>
    );
  };
}
