import {
  queryKeys,
  recordRecipeView,
  removeRecipeView,
  useAnalytics,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useCallback, useEffect, useState} from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';

import {IngredientsTab} from '../components/recipe/IngredientsTab';
import {InstructionsTab} from '../components/recipe/InstructionsTab';
import {NotesTab} from '../components/recipe/NotesTab';
import {NutritionTab} from '../components/recipe/NutritionTab';
import {OverviewTab} from '../components/recipe/OverviewTab';
import {
  RecipeDetailTabBar,
  type RecipeDetailTab,
} from '../components/recipe/RecipeDetailTabBar';
import {api} from '../lib/api';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage';
import type {RecipesStackParamList} from '../navigation/types';

type DetailProps = NativeStackScreenProps<
  RecipesStackParamList,
  'RecipeDetail'
>;

export const RecipeDetailScreen = ({route, navigation}: DetailProps) => {
  const {recipeId} = route.params;
  const [activeTab, setActiveTab] = useState<RecipeDetailTab>('overview');
  const [servings, setServings] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  const invalidateRecentlyViewed = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.recipes('home-recently-viewed'),
    });
  }, [queryClient]);

  useEffect(() => {
    void recordRecipeView(recipeViewHistoryStorage, recipeId).then(() => {
      invalidateRecentlyViewed();
    });
  }, [recipeId, invalidateRecentlyViewed]);

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => api.recipes.get(recipeId),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.recipes.delete(recipeId);
      await removeRecipeView(recipeViewHistoryStorage, recipeId);
    },
    onSuccess: () => {
      analytics.track('recipe_deleted', {recipe_id: recipeId});
      void queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()});
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
      <RecipeDetailTabBar
        activeTab={activeTab}
        onSelect={setActiveTab}
      />
      <ScrollView className="flex-1">
        {activeTab === 'overview' && (
          <OverviewTab
            recipe={recipe}
            onStartCooking={() => {
              navigation.navigate('CookingMode', {
                recipeId: recipe.id,
                servings: currentServings,
              });
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
