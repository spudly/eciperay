import {queryKeys} from '@recipoo/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {Alert, ScrollView, Text, TouchableOpacity, View} from 'react-native';

import {IngredientsTab} from '../components/recipe/IngredientsTab';
import {InstructionsTab} from '../components/recipe/InstructionsTab';
import {NotesTab} from '../components/recipe/NotesTab';
import {NutritionTab} from '../components/recipe/NutritionTab';
import {OverviewTab} from '../components/recipe/OverviewTab';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type Tab = 'overview' | 'ingredients' | 'instructions' | 'notes' | 'nutrition';

const TABS: {key: Tab; label: string}[] = [
  {key: 'overview', label: 'Overview'},
  {key: 'ingredients', label: 'Ingredients'},
  {key: 'instructions', label: 'Instructions'},
  {key: 'notes', label: 'Notes'},
  {key: 'nutrition', label: 'Nutrition'},
];

type DetailProps = NativeStackScreenProps<
  RecipesStackParamList,
  'RecipeDetail'
>;

const TabBar = ({
  activeTab,
  onSelect,
}: {
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
}) => (
  <View className="flex-row border-b border-gray-200">
    {TABS.map(tab => (
      <TouchableOpacity
        key={tab.key}
        className={`
          flex-1 items-center py-3
          ${activeTab === tab.key ? `border-primary border-b-2` : ''}
        `}
        onPress={() => {
          onSelect(tab.key);
        }}
      >
        <Text
          className={`
            text-xs font-medium
            ${activeTab === tab.key ? `text-primary` : `text-muted`}
          `}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

export const RecipeDetailScreen = ({route, navigation}: DetailProps) => {
  const {recipeId} = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [servings, setServings] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => api.recipes.get(recipeId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.recipes.delete(recipeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.recipes()});
      navigation.navigate('RecipesList');
    },
  });

  const handleDelete = () => {
    /* istanbul ignore next -- delete only rendered when recipe is loaded */
    if (!recipe) {
      return;
    }
    Alert.alert('Delete recipe', `Delete "${recipe.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate();
        },
      },
    ]);
  };

  if (isLoading || !recipe) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading…</Text>
      </View>
    );
  }

  const currentServings = servings ?? recipe.servings;
  const scaleFactor = currentServings / recipe.servings;

  return (
    <View className="flex-1 bg-white">
      <TabBar
        activeTab={activeTab}
        onSelect={setActiveTab}
      />
      <ScrollView className="flex-1">
        {activeTab === 'overview' && (
          <OverviewTab
            recipe={recipe}
            onStartCooking={() => {
              navigation.navigate('CookingMode', {recipeId: recipe.id});
            }}
            onEdit={() => {
              navigation.navigate('EditRecipe', {recipeId: recipe.id});
            }}
            onDelete={handleDelete}
          />
        )}
        {activeTab === 'ingredients' && (
          <IngredientsTab
            recipe={recipe}
            scaleFactor={scaleFactor}
            servings={currentServings}
            onServingsChange={setServings}
          />
        )}
        {activeTab === 'instructions' && <InstructionsTab recipe={recipe} />}
        {activeTab === 'notes' && <NotesTab recipeId={recipe.id} />}
        {activeTab === 'nutrition' && <NutritionTab recipeId={recipe.id} />}
      </ScrollView>
    </View>
  );
};
