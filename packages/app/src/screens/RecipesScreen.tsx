import React, {useState} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import type {Recipe} from '@recipoo/types';

import {apiFetch} from '../lib/api';

const fetchRecipes = () => apiFetch<Recipe[]>('/recipes');

const RecipeCard = ({
  recipe,
  onPress,
}: {
  recipe: Recipe;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="mb-3 rounded-xl bg-white p-4 shadow-sm"
    onPress={onPress}
  >
    <Text className="text-base font-semibold text-gray-900">
      {recipe.title}
    </Text>
    <Text className="mt-1 text-sm text-muted">
      {recipe.servings} servings
      {recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''}
    </Text>
  </TouchableOpacity>
);

type RecipesProps = {
  navigation: {navigate: (screen: string, params: object) => void};
};

const styles = StyleSheet.create({
  listContent: {paddingHorizontal: 16, paddingBottom: 32},
});

export const RecipesScreen = ({navigation}: RecipesProps) => {
  const [search, setSearch] = useState('');
  const {data: recipes = [], isLoading} = useQuery({
    queryKey: ['recipes'],
    queryFn: fetchRecipes,
  });

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 pb-2 pt-4">
        <TextInput
          className="
            rounded-xl border border-gray-200 bg-white px-4 py-3 text-base
          "
          placeholder="Search recipes…"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {isLoading ? (
        <Text className="mt-8 text-center text-muted">Loading…</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.listContent}
          renderItem={({item}) => (
            <RecipeCard
              recipe={item}
              onPress={() => {
                navigation.navigate('RecipeDetail', {recipeId: item.id});
              }}
            />
          )}
          ListEmptyComponent={
            <Text className="mt-8 text-center text-muted">
              No recipes found.
            </Text>
          }
        />
      )}
    </View>
  );
};
