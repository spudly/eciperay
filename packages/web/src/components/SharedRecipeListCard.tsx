import type {RecipeDetail} from '@eciperay/types';
import {formatRecipeListSubtitle, makeRecipeDetail} from '@eciperay/client';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';

import {ThumbnailListCard} from './ui/ThumbnailListCard.js';

// Parity note (#278): the card subtitle is formatted by the shared
// formatRecipeListSubtitle in @eciperay/client — the per-mirror local
// copies are gone, so the servings pluralization and satiety label are
// defined once for both mirrors and the app's DS-page hosts.

type SharedRecipeListCardProps = {recipe: RecipeDetail};

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const SharedRecipeListCard = ({recipe}: SharedRecipeListCardProps) => (
  <ThumbnailListCard
    imageUrl={recipe.imageUrl}
    title={recipe.title}
    subtitle={formatRecipeListSubtitle(recipe)}
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
