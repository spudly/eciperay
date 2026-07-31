import {makeRecipeDetail, type ShowcaseDemoRenderer} from '@eciperay/client';
import type {RecipeCommunityRating, RecipeStarRating} from '@eciperay/types';

import {RecipeCommentsSection} from './RecipeCommentsSection.js';
import {RecipeRatingsSection} from './RecipeRatingsSection.js';

type Props = {
  recipeId: string;
  ownerUserId?: string;
  communityRating: RecipeCommunityRating | null;
  viewerRating: RecipeStarRating | null;
  viewerRatingIsStale: boolean;
  editableRatings: boolean;
  shareToken?: string;
  publicList?: boolean;
  publicContext?: {slug?: string; shareToken?: string};
};

export const RecipeEngagementPanel = ({
  recipeId,
  ownerUserId,
  communityRating,
  viewerRating,
  viewerRatingIsStale,
  editableRatings,
  shareToken,
  publicList = false,
  publicContext,
}: Props) => (
  <div className="px-4 pb-4">
    <RecipeRatingsSection
      recipeId={recipeId}
      communityRating={communityRating}
      viewerRating={viewerRating}
      viewerRatingIsStale={viewerRatingIsStale}
      editable={editableRatings}
      publicContext={publicContext}
    />
    <RecipeCommentsSection
      recipeId={recipeId}
      ownerUserId={ownerUserId}
      shareToken={shareToken}
      publicList={publicList}
    />
  </div>
);

if (import.meta.env.DEV) {
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
          editableRatings
        />
      </Frame>
    );
  };
  RecipeEngagementPanel.demo = recipeEngagementPanelDemo;
}
