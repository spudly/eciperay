import {queryKeys} from '@recipoo/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {RecipeDetail} from '@recipoo/types';

import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type RecipesProps = NativeStackScreenProps<
  RecipesStackParamList,
  'RecipesList'
>;

const RecipeThumbnail = ({recipe}: {recipe: RecipeDetail}) =>
  recipe.imageUrl ? (
    <Image
      source={{uri: recipe.imageUrl}}
      className="size-16 rounded-lg bg-gray-50"
      resizeMode="cover"
    />
  ) : (
    <View className="size-16 rounded-lg bg-gray-100" />
  );

const RecipeCard = ({
  recipe,
  onPress,
  onDelete,
}: {
  recipe: RecipeDetail;
  onPress: () => void;
  onDelete: () => void;
}) => (
  <View
    className="
      mb-3 flex-row items-center gap-3 rounded-xl bg-white p-4 shadow-sm
    "
  >
    <TouchableOpacity onPress={onPress}>
      <RecipeThumbnail recipe={recipe} />
    </TouchableOpacity>
    <TouchableOpacity
      className="min-w-0 flex-1"
      onPress={onPress}
    >
      <Text className="text-base font-semibold text-gray-900">
        {recipe.title}
      </Text>
      <Text className="text-muted mt-1 text-sm">
        {recipe.servings} servings
        {recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      className="ms-3 rounded-lg bg-red-50 px-3 py-1"
      onPress={onDelete}
    >
      <Text className="text-sm text-red-600">Delete</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  listContent: {paddingHorizontal: 16, paddingBottom: 32},
});

export const RecipesScreen = ({navigation}: RecipesProps) => {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const {data: recipes = [], isLoading} = useQuery({
    queryKey: queryKeys.recipes(),
    queryFn: () => api.recipes.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.recipes.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.recipes()});
    },
  });

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()),
  );

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
          data={filtered}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.listContent}
          renderItem={({item}) => (
            <RecipeCard
              recipe={item}
              onPress={() => {
                navigation.navigate('RecipeDetail', {recipeId: item.id});
              }}
              onDelete={() => {
                confirmDelete(item);
              }}
            />
          )}
          ListEmptyComponent={
            <Text className="text-muted mt-8 text-center">
              No recipes found.
            </Text>
          }
        />
      )}
    </View>
  );
};
