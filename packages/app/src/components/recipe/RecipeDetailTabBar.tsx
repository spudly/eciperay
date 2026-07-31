import clsx from 'clsx';
import React from 'react';
import {ScrollView, Text, TouchableOpacity} from 'react-native';

export type RecipeDetailTab =
  | 'overview'
  | 'ingredients'
  | 'instructions'
  | 'history'
  | 'nutrition';

const TABS: {key: RecipeDetailTab; label: string}[] = [
  {key: 'overview', label: 'Overview'},
  {key: 'ingredients', label: 'Ingredients'},
  {key: 'instructions', label: 'Instructions'},
  {key: 'history', label: 'Cook History'},
  {key: 'nutrition', label: 'Nutrition'},
];

type RecipeDetailTabBarProps = {
  activeTab: RecipeDetailTab;
  onSelect: (tab: RecipeDetailTab) => void;
};

export const RecipeDetailTabBar = ({
  activeTab,
  onSelect,
}: RecipeDetailTabBarProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    className="border-b border-gray-200"
    contentContainerClassName="flex-row"
  >
    {TABS.map(tab => (
      <TouchableOpacity
        key={tab.key}
        className={clsx('items-center px-4 py-3', {
          'border-primary border-b-2': activeTab === tab.key,
        })}
        onPress={() => {
          onSelect(tab.key);
        }}
      >
        <Text
          className={clsx('text-xs font-medium', {
            'text-primary': activeTab === tab.key,
            'text-muted': activeTab !== tab.key,
          })}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);
