import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {DISCOVER_NO_RATINGS_LABEL} from '@eciperay/client';
import {Link} from 'react-router-dom';

const RecipeThumbnail = ({recipe}: {recipe: PublicRecipeDiscoveryItem}) =>
  recipe.imageUrl ? (
    <img
      src={recipe.imageUrl}
      alt={recipe.title}
      className="size-16 shrink-0 rounded-lg bg-gray-50 object-cover"
    />
  ) : (
    <div
      aria-hidden
      className="size-16 shrink-0 rounded-lg bg-gray-100"
    />
  );

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
  <Link
    to={`/recipe/${recipe.id}/${recipe.slug}`}
    className="mb-3 flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
  >
    <RecipeThumbnail recipe={recipe} />
    <div className="min-w-0 flex-1">
      <p className="text-base font-semibold text-gray-900">{recipe.title}</p>
      <p className="text-muted mt-1 text-sm">
        By {formatAuthorName(recipe.authorDisplayName)}
      </p>
      <p className="text-muted mt-1 text-sm">{DISCOVER_NO_RATINGS_LABEL}</p>
    </div>
  </Link>
);
