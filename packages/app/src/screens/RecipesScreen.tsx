import {
  invalidateRecipeQueries,
  recipeListInfiniteQueryOptions,
  useAnalytics,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import React, {useDeferredValue, useState} from 'react';
import {Alert, FlatList, StyleSheet, Text, TextInput, View} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

import {RecipeListCard} from '../components/RecipeListCard';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type RecipesProps = NativeStackScreenProps<
  RecipesStackParamList,
  'RecipesList'
>;

const styles = StyleSheet.create({
  listContent: {paddingHorizontal: 16, paddingBottom: 32},
});

export const RecipesScreen = ({navigation}: RecipesProps) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      recipeListInfiniteQueryOptions(
        params => api.recipes.list(params),
        deferredSearch,
      ),
    );

  const recipes = data?.pages.flat() ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.recipes.delete(id),
    onSuccess: (_data, id) => {
      analytics.track('recipe_deleted', {recipe_id: id});
      void invalidateRecipeQueries(queryClient, id);
    },
  });

  const confirmDelete = (recipe: RecipeDetail) => {
    Alert.alert('Delete recipe', `Delete "${recipe.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(recipe.id);
        },
      },
    ]);
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

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
        <Text className="text-muted mt-8 text-center">Loading…</Text>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.listContent}
          renderItem={({item}) => (
            <RecipeListCard
              recipe={item}
              onPress={() => {
                navigation.navigate('RecipeDetail', {recipeId: item.id});
              }}
              onDelete={() => {
                confirmDelete(item);
              }}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text className="text-muted mt-8 text-center">
              No recipes found.
            </Text>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <Text className="text-muted py-4 text-center text-sm">
                Loading more…
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
};
