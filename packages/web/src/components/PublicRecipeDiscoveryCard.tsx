import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {formatDiscoveryListMeta} from '@eciperay/client';

import {ThumbnailListCard} from './ui/ThumbnailListCard.js';

const formatAuthorName = (authorDisplayName: string | null) => {
  if (authorDisplayName?.trim()) {
    return authorDisplayName.trim();
  }
  return 'Anonymous';
};

type PublicRecipeDiscoveryCardProps = {recipe: PublicRecipeDiscoveryItem};

export const PublicRecipeDiscoveryCard = ({
  recipe,
}: PublicRecipeDiscoveryCardProps) => (
  <ThumbnailListCard
    imageUrl={recipe.imageUrl}
    title={recipe.title}
    subtitle={`By ${formatAuthorName(recipe.authorDisplayName)} · ${formatDiscoveryListMeta(recipe)}`}
    linkTo={`/recipe/${recipe.id}/${recipe.slug}`}
  />
);
