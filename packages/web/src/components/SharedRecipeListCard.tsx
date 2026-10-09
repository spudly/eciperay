import type {RecipeDetail} from '@eciperay/types';
import {formatRecipeListMeta, makeRecipeDetail} from '@eciperay/client';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';

import {ThumbnailListCard} from './ui/ThumbnailListCard.js';

const formatRecipeSubtitle = (recipe: RecipeDetail) =>
  `${recipe.servings} servings${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${formatRecipeListMeta(recipe)}`;

type SharedRecipeListCardProps = {recipe: RecipeDetail};

export const SharedRecipeListCard = ({recipe}: SharedRecipeListCardProps) => (
  <ThumbnailListCard
    imageUrl={recipe.imageUrl}
    title={recipe.title}
    subtitle={formatRecipeSubtitle(recipe)}
    linkTo={`/recipe/${recipe.id}/${recipe.slug}`}
  />
);

if (import.meta.env.DEV) {
  SharedRecipeListCard.demo = function SharedRecipeListCardDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    const mockRecipe = makeRecipeDetail();

    return (
      <Frame>
        <SharedRecipeListCard recipe={mockRecipe} />
      </Frame>
    );
  };
}
