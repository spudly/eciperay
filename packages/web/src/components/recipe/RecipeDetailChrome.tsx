import type {RecipeDetailChromeProps, RecipeDetailTab} from '@eciperay/client';
import {makeRecipeDetail, makeRecipeVersionSummary} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';

import {InfoBanner} from '../ui/InfoBanner.js';

import {RecipeStatusBadge} from './RecipeStatusBadge.js';
import {VersionPicker} from './VersionPicker.js';

const TABS: {key: RecipeDetailTab; label: string}[] = [
  {key: 'overview', label: 'Overview'},
  {key: 'ingredients', label: 'Ingredients'},
  {key: 'instructions', label: 'Instructions'},
  {key: 'history', label: 'Cook History'},
  {key: 'nutrition', label: 'Nutrition'},
];

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
    <div className="ui-recipe-detail-tabs">
      {TABS.map(tab => (
        <button
          key={tab.key}
          type="button"
          className={clsx('flex-1 py-3 text-xs font-medium', {
            'border-primary text-primary border-b-2': activeTab === tab.key,
            'text-muted': activeTab !== tab.key,
          })}
          onClick={() => {
            onSelectTab(tab.key);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
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

  RecipeDetailChrome.demo = function RecipeDetailChromeDemoWrapper() {
    return <RecipeDetailChromeDemo />;
  };
}
