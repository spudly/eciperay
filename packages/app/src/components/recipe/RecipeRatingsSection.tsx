import {
  formatCommunityRatingLabel,
  queryKeys,
  STALE_COMMUNITY_RATING_HINT,
  STALE_VIEWER_RATING_HINT,
  useAuth,
} from '@eciperay/client';
import type {RecipeCommunityRating, RecipeStarRating} from '@eciperay/types';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {api} from '../../lib/api';

import {StaleVersionHint} from './StaleVersionHint';

const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

type Props = {
  recipeId: string;
  communityRating: RecipeCommunityRating | null;
  viewerRating: RecipeStarRating | null;
  viewerRatingIsStale: boolean;
};

export const RecipeRatingsSection = ({
  recipeId,
  communityRating,
  viewerRating,
  viewerRatingIsStale,
}: Props) => {
  const {session} = useAuth();
  const queryClient = useQueryClient();

  const ratingMutation = useMutation({
    mutationFn: async (stars: RecipeStarRating | null) => {
      if (stars === null) {
        return api.recipes.deleteRating(recipeId);
      }
      return api.recipes.putRating(recipeId, {stars});
    },
    onSuccess: data => {
      queryClient.setQueryData(queryKeys.recipe(recipeId), data);
    },
  });

  const handleStarPress = (star: RecipeStarRating) => {
    const next = viewerRating === star ? null : star;
    ratingMutation.mutate(next);
  };

  return (
    <View className="mb-4 rounded-xl bg-gray-50 p-4">
      <Text
        className="
          mb-1 text-xs font-medium uppercase tracking-wide text-gray-500
        "
      >
        Community rating
      </Text>
      {communityRating ? (
        <View className="mb-3 flex-row items-center gap-2">
          <Text className="text-yellow-400">
            {'★'.repeat(Math.round(communityRating.average))}
          </Text>
          <Text className="text-sm text-gray-800">
            {formatCommunityRatingLabel(
              communityRating.average,
              communityRating.count,
            )}
          </Text>
          {communityRating.hasStaleRatings ? (
            <StaleVersionHint label={STALE_COMMUNITY_RATING_HINT} />
          ) : null}
        </View>
      ) : (
        <Text className="mb-3 text-sm text-gray-600">
          No community ratings yet
        </Text>
      )}
      {session ? (
        <>
          <Text
            className="
              mb-1 text-xs font-medium uppercase tracking-wide text-gray-500
            "
          >
            Your rating
          </Text>
          <View className="flex-row items-center gap-2">
            {STAR_RATINGS.map(star => (
              <TouchableOpacity
                key={star}
                accessibilityLabel={`${star} stars`}
                disabled={ratingMutation.isPending}
                onPress={() => {
                  handleStarPress(star);
                }}
              >
                <Text
                  className={
                    viewerRating !== null && star <= viewerRating
                      ? 'text-2xl text-yellow-400'
                      : 'text-2xl text-gray-300'
                  }
                >
                  ★
                </Text>
              </TouchableOpacity>
            ))}
            {viewerRatingIsStale ? (
              <StaleVersionHint label={STALE_VIEWER_RATING_HINT} />
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
};
