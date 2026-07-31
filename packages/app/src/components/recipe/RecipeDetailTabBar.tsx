import {RECIPE_DETAIL_TABS, type RecipeDetailTab} from '@eciperay/client';

import {TabBar} from '../ui/TabBar';

type RecipeDetailTabBarProps = {
  activeTab: RecipeDetailTab;
  onSelect: (tab: RecipeDetailTab) => void;
};

export const RecipeDetailTabBar = ({
  activeTab,
  onSelect,
}: RecipeDetailTabBarProps) => (
  <TabBar
    tabs={RECIPE_DETAIL_TABS}
    activeTab={activeTab}
    onTabChange={key => {
      onSelect(key as RecipeDetailTab);
    }}
  />
);

export {type RecipeDetailTab} from '@eciperay/client';
