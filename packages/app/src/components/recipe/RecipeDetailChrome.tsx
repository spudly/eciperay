import type {RecipeDetailChromeProps, RecipeDetailTab} from '@eciperay/client';
import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
  RECIPE_DETAIL_TABS,
} from '@eciperay/client';
import {useState} from 'react';
import {View} from 'react-native';

import {InfoBanner} from '../ui/InfoBanner';
import {TabBar} from '../ui/TabBar';

import {RecipeStatusBadge} from './RecipeStatusBadge';
import {VersionPicker} from './VersionPicker';

export const RecipeDetailChrome = ({
  status,
  versions,
  selectedVersionId,
  onSelectVersion,
  activeTab,
  onSelectTab,
  children,
}: RecipeDetailChromeProps) => (
  <View className="flex-1 bg-white">
    <View className="ui-recipe-detail-toolbar">
      <RecipeStatusBadge status={status} />
      <VersionPicker
        versions={versions}
        selectedVersionId={selectedVersionId}
        onSelect={onSelectVersion}
      />
    </View>
    <TabBar
      tabs={RECIPE_DETAIL_TABS}
      activeTab={activeTab}
      onTabChange={key => {
        onSelectTab(key as RecipeDetailTab);
      }}
    />
    {children}
  </View>
);

if (__DEV__) {
  const RecipeDetailChromeDemo = () => {
    const recipe = makeRecipeDetail();
    const [activeTab, setActiveTab] = useState<RecipeDetailTab>('overview');
    const [selectedVersionId, setSelectedVersionId] = useState(
      recipe.versionId,
    );

    return (
      <RecipeDetailChrome
        status={recipe.status}
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

  RecipeDetailChrome.demo = () => <RecipeDetailChromeDemo />;
}
