import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import type {
  RecipeDetail,
  RecipeRatingSummary,
  RecipeVersionSummary,
} from '@eciperay/types';
import React, {useState} from 'react';

import {CookHistoryTab} from './CookHistoryTab';
import {IngredientsTab} from './IngredientsTab';
import {InstructionsTab} from './InstructionsTab';
import {NutritionTab} from './NutritionTab';
import {OverviewTab} from './OverviewTab';
import {RecipeEngagementPanel} from './RecipeEngagementPanel';
import type {RecipeDetailTab} from './RecipeDetailTabBar';

type Props = {
  activeTab: RecipeDetailTab;
  recipe: RecipeDetail;
  displayRecipe: RecipeDetail;
  versions: RecipeVersionSummary[];
  currentServings: number;
  scaleFactor: number;
  onServingsChange: (servings: number) => void;
  onStartCooking: () => void;
  onDelete: () => void;
  onTweakAi: () => void;
  onViewVersion: (versionId: string) => void;
  onEditRecipe: () => void;
  onEditVersion: (versionId: string) => void;
};

export const RecipeDetailTabPanel = ({
  activeTab,
  recipe,
  displayRecipe,
  versions,
  currentServings,
  scaleFactor,
  onServingsChange,
  onStartCooking,
  onDelete,
  onTweakAi,
  onViewVersion,
  onEditRecipe,
  onEditVersion,
}: Props) => {
  if (activeTab === 'overview') {
    const ratings = recipe as RecipeDetail & RecipeRatingSummary;
    return (
      <>
        <OverviewTab
          recipe={displayRecipe}
          activeVersionId={recipe.versionId}
          servings={currentServings}
          versions={versions}
          onStartCooking={onStartCooking}
          onDelete={onDelete}
          onTweakAi={onTweakAi}
          onViewVersion={onViewVersion}
          onEditRecipe={onEditRecipe}
          onEditVersion={onEditVersion}
        />
        <RecipeEngagementPanel
          recipeId={recipe.id}
          ownerUserId={recipe.userId}
          communityRating={ratings.communityRating}
          viewerRating={ratings.viewerRating}
          viewerRatingIsStale={ratings.viewerRatingIsStale}
        />
      </>
    );
  }
  if (activeTab === 'ingredients') {
    return (
      <IngredientsTab
        recipe={displayRecipe}
        scaleFactor={scaleFactor}
        servings={currentServings}
        onServingsChange={onServingsChange}
      />
    );
  }
  if (activeTab === 'instructions') {
    return <InstructionsTab recipe={displayRecipe} />;
  }
  if (activeTab === 'history') {
    return (
      <CookHistoryTab
        recipeId={recipe.id}
        versionId={displayRecipe.versionId}
      />
    );
  }
  return <NutritionTab recipeId={recipe.id} />;
};

if (__DEV__) {
  const RecipeDetailTabPanelDemo = () => {
    const recipe = makeRecipeDetail();
    const [servings, setServings] = useState(recipe.servings);
    return (
      <RecipeDetailTabPanel
        activeTab="overview"
        recipe={recipe}
        displayRecipe={recipe}
        versions={[makeRecipeVersionSummary()]}
        currentServings={servings}
        scaleFactor={1}
        onServingsChange={setServings}
        onStartCooking={() => {
          void 0;
        }}
        onDelete={() => {
          void 0;
        }}
        onTweakAi={() => {
          void 0;
        }}
        onViewVersion={() => {
          void 0;
        }}
        onEditRecipe={() => {
          void 0;
        }}
        onEditVersion={() => {
          void 0;
        }}
      />
    );
  };

  const recipeDetailTabPanelDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <RecipeDetailTabPanelDemo />
    </Frame>
  );
  RecipeDetailTabPanel.demo = recipeDetailTabPanelDemo;
}
