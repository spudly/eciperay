import {
  formatCommunityRatingLabel,
  makeRecipeDetail,
  queryKeys,
  STALE_COMMUNITY_RATING_HINT,
  STALE_VIEWER_RATING_HINT,
  useAuth,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import type {RecipeCommunityRating, RecipeStarRating} from '@eciperay/types';
import {Card as DsCard, Text as DsText, tokens} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {XStack} from 'tamagui';

import {api} from '../../lib/api';
import {StarRatingInput} from '../ui/StarRatingInput';

import {StaleVersionHint} from './StaleVersionHint';

type Props = {
  recipeId: string;
  communityRating: RecipeCommunityRating | null;
  viewerRating: RecipeStarRating | null;
  viewerRatingIsStale: boolean;
};

const EyebrowLabel = ({children}: {children: string}) => (
  <DsText
    marginBlockEnd="$1"
    fontSize={tokens.typography.fontSize.xs}
    fontWeight={tokens.typography.fontWeight.medium}
    letterSpacing={0.3}
    color={tokens.colors.gray.gray6}
    textTransform="uppercase"
  >
    {children}
  </DsText>
);

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

  return (
    <DsCard
      variant="muted"
      marginBlockEnd="$4"
    >
      <EyebrowLabel>Community rating</EyebrowLabel>
      {communityRating ? (
        <XStack
          marginBlockEnd="$3"
          alignItems="center"
          gap="$2"
        >
          <DsText color={tokens.colors.warning.warning5}>
            {'★'.repeat(Math.round(communityRating.average))}
          </DsText>
          <DsText
            fontSize={tokens.typography.fontSize.sm}
            color={tokens.colors.gray.gray9}
          >
            {formatCommunityRatingLabel(
              communityRating.average,
              communityRating.count,
            )}
          </DsText>
          {communityRating.hasStaleRatings ? (
            <StaleVersionHint label={STALE_COMMUNITY_RATING_HINT} />
          ) : null}
        </XStack>
      ) : (
        <DsText
          marginBlockEnd="$3"
          fontSize={tokens.typography.fontSize.sm}
          color={tokens.colors.gray.gray7}
        >
          No community ratings yet
        </DsText>
      )}
      {session ? (
        <>
          <EyebrowLabel>Your rating</EyebrowLabel>
          <XStack
            alignItems="center"
            gap="$2"
          >
            <StarRatingInput
              value={viewerRating}
              disabled={ratingMutation.isPending}
              onChange={star => {
                ratingMutation.mutate(star as RecipeStarRating | null);
              }}
            />
            {viewerRatingIsStale ? (
              <StaleVersionHint label={STALE_VIEWER_RATING_HINT} />
            ) : null}
          </XStack>
        </>
      ) : null}
    </DsCard>
  );
};

if (__DEV__) {
  const recipeRatingsSectionDemo: ShowcaseDemoRenderer = ({Frame}) => {
    const recipe = makeRecipeDetail();
    return (
      <Frame>
        <RecipeRatingsSection
          recipeId={recipe.id}
          communityRating={null}
          viewerRating={null}
          viewerRatingIsStale={false}
        />
      </Frame>
    );
  };
  RecipeRatingsSection.demo = recipeRatingsSectionDemo;
}
