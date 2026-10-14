import type {RecipeDetailChromeProps, RecipeDetailTab} from '@eciperay/client';
import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
  RECIPE_DETAIL_TABS,
} from '@eciperay/client';
import {useState} from 'react';
import {Card} from '@spudly/ui';
import {XStack} from 'tamagui';

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
  <Card>
    <XStack
      flexWrap="wrap"
      alignItems="center"
      gap="$2"
      justifyContent="space-between"
      borderBottomWidth={1}
      borderBottomColor="$border"
      paddingHorizontal="$4"
      paddingVertical="$3"
    >
      <div className="flex items-center gap-2">
        <RecipeStatusBadge status={status} />
        <VersionPicker
          recipeId={recipeId ?? ''}
          versions={versions}
          selectedVersionId={selectedVersionId}
          onSelect={onSelectVersion}
        />
      </div>
    </XStack>
    <TabBar
      tabs={RECIPE_DETAIL_TABS}
      activeTab={activeTab}
      onTabChange={key => {
        onSelectTab(key as RecipeDetailTab);
      }}
    />
    {children}
  </Card>
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
