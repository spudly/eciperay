import {makeRecipeDetail, type ShowcaseDemoRenderer} from '@eciperay/client';
import type {RecipeCommunityRating, RecipeStarRating} from '@eciperay/types';
import React from 'react';
import {View} from 'react-native';

import {RecipeCommentsSection} from './RecipeCommentsSection';
import {RecipeRatingsSection} from './RecipeRatingsSection';

type Props = {
  recipeId: string;
  ownerUserId: string;
  communityRating: RecipeCommunityRating | null;
  viewerRating: RecipeStarRating | null;
  viewerRatingIsStale: boolean;
};

export const RecipeEngagementPanel = ({
  recipeId,
  ownerUserId,
  communityRating,
  viewerRating,
  viewerRatingIsStale,
}: Props) => (
  <View className="px-4 pbe-4">
    <RecipeRatingsSection
      recipeId={recipeId}
      communityRating={communityRating}
      viewerRating={viewerRating}
      viewerRatingIsStale={viewerRatingIsStale}
    />
    <RecipeCommentsSection
      recipeId={recipeId}
      ownerUserId={ownerUserId}
    />
  </View>
);

if (__DEV__) {
  const recipeEngagementPanelDemo: ShowcaseDemoRenderer = ({Frame}) => {
    const recipe = makeRecipeDetail();
    return (
      <Frame>
        <RecipeEngagementPanel
          recipeId={recipe.id}
          ownerUserId={recipe.userId}
          communityRating={null}
          viewerRating={null}
          viewerRatingIsStale={false}
        />
      </Frame>
    );
  };
  RecipeEngagementPanel.demo = recipeEngagementPanelDemo;
}
