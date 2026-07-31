import type {RecipeDetailChromeProps, RecipeDetailTab} from '@eciperay/client';
import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
  RECIPE_DETAIL_TABS,
} from '@eciperay/client';
import {useState} from 'react';

import {InfoBanner} from '../ui/InfoBanner.js';
import {TabBar} from '../ui/TabBar.js';

import {RecipeStatusBadge} from './RecipeStatusBadge.js';
import {VersionPicker} from './VersionPicker.js';

export const RecipeDetailChrome = ({
  status,
  recipeId,
  versions,
  selectedVersionId,
  onSelectVersion,
  activeTab,
  onSelectTab,
  children,
}: RecipeDetailChromeProps) => (
  <div className="ui-recipe-detail-card">
    <div className="ui-recipe-detail-toolbar justify-between">
      <div className="flex items-center gap-2">
        <RecipeStatusBadge status={status} />
        <VersionPicker
          recipeId={recipeId ?? ''}
          versions={versions}
          selectedVersionId={selectedVersionId}
          onSelect={onSelectVersion}
        />
      </div>
    </div>
    <TabBar
      tabs={RECIPE_DETAIL_TABS}
      activeTab={activeTab}
      onTabChange={key => {
        onSelectTab(key as RecipeDetailTab);
      }}
    />
    {children}
  </div>
);

if (import.meta.env.DEV) {
  const RecipeDetailChromeDemo = () => {
    const recipe = makeRecipeDetail();
    const [activeTab, setActiveTab] = useState<RecipeDetailTab>('overview');
    const [selectedVersionId, setSelectedVersionId] = useState(
      recipe.versionId,
    );

    return (
      <RecipeDetailChrome
        status={recipe.status}
        recipeId={recipe.id}
        versions={[makeRecipeVersionSummary()]}
        selectedVersionId={selectedVersionId}
        onSelectVersion={setSelectedVersionId}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      >
        <InfoBanner>
          Tab panel content renders here on the recipe detail screen.
        </InfoBanner>
      </RecipeDetailChrome>
    );
  };

  RecipeDetailChrome.demo = RecipeDetailChromeDemo;
}
