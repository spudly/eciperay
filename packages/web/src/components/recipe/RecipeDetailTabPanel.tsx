import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';

import {CookHistoryTab} from './CookHistoryTab.js';
import {IngredientsTab} from './IngredientsTab.js';
import {InstructionsTab} from './InstructionsTab.js';
import {NutritionTab} from './NutritionTab.js';
import {OverviewTab} from './OverviewTab.js';

type Tab =
  | 'overview'
  | 'ingredients'
  | 'instructions'
  | 'history'
  | 'nutrition';

type Props = {
  activeTab: Tab;
  recipe: RecipeDetail;
  displayRecipe: RecipeDetail;
  versions: RecipeVersionSummary[];
  currentServings: number;
  scaleFactor: number;
  onServingsChange: (servings: number) => void;
};

export const RecipeDetailTabPanel = ({
  activeTab,
  recipe,
  displayRecipe,
  versions,
  currentServings,
  scaleFactor,
  onServingsChange,
}: Props) => {
  if (activeTab === 'overview') {
    return (
      <OverviewTab
        recipe={displayRecipe}
        activeVersionId={recipe.versionId}
        servings={currentServings}
        versions={versions}
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
