import type {RecipeDetailChromeProps, RecipeDetailTab} from '@eciperay/client';
import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
  RECIPE_DETAIL_TABS,
} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {useState} from 'react';
import {XStack, YStack} from 'tamagui';

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
  <YStack
    flex={1}
    backgroundColor="$surface"
  >
    {/* The old ui-recipe-detail-toolbar utility, expressed with DS tokens. */}
    <XStack
      flexWrap="wrap"
      alignItems="center"
      gap="$2"
      borderBottomWidth={1}
      borderColor={tokens.colors.gray.gray2}
      paddingHorizontal="$4"
      paddingVertical="$3"
    >
      <RecipeStatusBadge status={status} />
      <VersionPicker
        versions={versions}
        selectedVersionId={selectedVersionId}
        onSelect={onSelectVersion}
      />
    </XStack>
    <TabBar
      tabs={RECIPE_DETAIL_TABS}
      activeTab={activeTab}
      onTabChange={key => {
        onSelectTab(key as RecipeDetailTab);
      }}
    />
    {children}
  </YStack>
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
