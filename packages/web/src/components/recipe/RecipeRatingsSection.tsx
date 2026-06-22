import {
  formatCommunityRatingLabel,
  queryKeys,
  STALE_COMMUNITY_RATING_HINT,
  STALE_VIEWER_RATING_HINT,
  useAuth,
} from '@eciperay/client';
import type {RecipeCommunityRating, RecipeStarRating} from '@eciperay/types';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import clsx from 'clsx';

import {eciperay} from '../../lib/api.js';

import {StaleVersionHint} from './StaleVersionHint.js';

const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

type Props = {
  recipeId: string;
  communityRating: RecipeCommunityRating | null;
  viewerRating: RecipeStarRating | null;
  viewerRatingIsStale: boolean;
  editable: boolean;
  publicContext?: {slug?: string; shareToken?: string};
};

export const RecipeRatingsSection = ({
  recipeId,
  communityRating,
  viewerRating,
  viewerRatingIsStale,
  editable,
  publicContext,
}: Props) => {
  const {session} = useAuth();
  const queryClient = useQueryClient();

  const ratingMutation = useMutation({
    mutationFn: async (stars: RecipeStarRating | null) => {
      if (stars === null) {
        return eciperay.recipes.deleteRating(recipeId);
      }
      return eciperay.recipes.putRating(recipeId, {stars});
    },
    onSuccess: data => {
      queryClient.setQueryData(queryKeys.recipe(recipeId), data);
      if (publicContext) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.publicRecipe(
            recipeId,
            publicContext.slug,
            publicContext.shareToken,
          ),
        });
      }
    },
  });

  const handleStarClick = (star: RecipeStarRating) => {
    const next = viewerRating === star ? null : star;
    ratingMutation.mutate(next);
  };

  return (
    <div className="mb-4 rounded-xl bg-gray-50 p-4">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Community rating
        </p>
        {communityRating ? (
          <div className="flex items-center gap-2">
            <span
              className="text-yellow-400"
              aria-label={`${communityRating.average} out of 5 stars`}
            >
              {'★'.repeat(Math.round(communityRating.average))}
            </span>
            <span className="text-sm text-gray-800">
              {formatCommunityRatingLabel(
                communityRating.average,
                communityRating.count,
              )}
            </span>
            {communityRating.hasStaleRatings ? (
              <StaleVersionHint label={STALE_COMMUNITY_RATING_HINT} />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No community ratings yet</p>
        )}
      </div>
      {editable ? (
        <div>
          <p
            className="
              text-xs font-medium uppercase tracking-wide text-gray-500
            "
          >
            Your rating
          </p>
          <div className="flex items-center gap-2">
            {STAR_RATINGS.map(star => (
              <button
                key={star}
                type="button"
                aria-label={`${star} stars`}
                className={clsx('text-2xl', {
                  'text-yellow-400':
                    viewerRating !== null && star <= viewerRating,
                  'text-gray-300': viewerRating === null || star > viewerRating,
                })}
                disabled={ratingMutation.isPending}
                onClick={() => {
                  handleStarClick(star);
                }}
              >
                ★
              </button>
            ))}
            {viewerRatingIsStale ? (
              <StaleVersionHint label={STALE_VIEWER_RATING_HINT} />
            ) : null}
          </div>
        </div>
      ) : null}
      {!editable && !session ? (
        <p className="text-sm text-gray-600">Sign in to rate this recipe</p>
      ) : null}
    </div>
  );
};
