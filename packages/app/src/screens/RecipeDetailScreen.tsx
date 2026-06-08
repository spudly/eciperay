import React, {useState} from 'react';
import {ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RecipeDetail} from '@recipoo/types';

import {apiFetch} from '../lib/api';
import {IngredientsTab} from '../components/recipe/IngredientsTab';
import {InstructionsTab} from '../components/recipe/InstructionsTab';
import {NotesTab} from '../components/recipe/NotesTab';
import {NutritionTab} from '../components/recipe/NutritionTab';
import {OverviewTab} from '../components/recipe/OverviewTab';
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

const fetchRecipe = (id: string) => apiFetch<RecipeDetail>(`/recipes/${id}`);

export const RecipeDetailScreen = ({route, navigation}: DetailProps) => {
  const {recipeId} = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [servings, setServings] = useState<number | null>(null);
  const {data: recipe, isLoading} = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => fetchRecipe(recipeId),
  });
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
      <View className="flex-row border-b border-gray-200">
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            className={`flex-1 py-3 items-center ${activeTab === tab.key ? 'border-b-2 border-primary' : ''}`}
            onPress={() => {
              setActiveTab(tab.key);
            }}
          >
            <Text
              className={`text-xs font-medium ${activeTab === tab.key ? 'text-primary' : 'text-muted'}`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView className="flex-1">
        {activeTab === 'overview' && (
          <OverviewTab
            recipe={recipe}
            onStartCooking={() => {
              navigation.navigate('CookingMode', {recipeId: recipe.id});
            }}
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
