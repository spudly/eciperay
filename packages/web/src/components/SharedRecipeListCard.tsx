import type {RecipeDetail} from '@eciperay/types';
import {formatRecipeListMeta, makeRecipeDetail} from '@eciperay/client';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';

import {ThumbnailListCard} from './ui/ThumbnailListCard.js';

// Parity note (#49, Wave A): the app mirror exports its
// formatRecipeSubtitle so the app's Shared-with-me view can format the
// DS page's items with the card's own helper. This mirror keeps its
// local copy — the web view still renders these cards directly.
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
