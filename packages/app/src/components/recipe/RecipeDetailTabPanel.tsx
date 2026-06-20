import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import React from 'react';

import {CookHistoryTab} from './CookHistoryTab';
import {IngredientsTab} from './IngredientsTab';
import {InstructionsTab} from './InstructionsTab';
import {NutritionTab} from './NutritionTab';
import {OverviewTab} from './OverviewTab';
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
    return (
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
