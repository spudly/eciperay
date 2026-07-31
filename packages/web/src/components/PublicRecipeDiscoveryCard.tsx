import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {DISCOVER_NO_RATINGS_LABEL} from '@eciperay/client';

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
    subtitle={`By ${formatAuthorName(recipe.authorDisplayName)}`}
    trailing={
      <p className="text-muted mt-1 text-sm">{DISCOVER_NO_RATINGS_LABEL}</p>
    }
    linkTo={`/recipe/${recipe.id}/${recipe.slug}`}
  />
);
