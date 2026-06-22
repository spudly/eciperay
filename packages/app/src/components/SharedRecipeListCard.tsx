import {buildRecipePermalink, WEB_APP_BASE_URL} from '@eciperay/client';
import React from 'react';
import {Image, Linking, Text, TouchableOpacity, View} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

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

type Props = {recipe: RecipeDetail};

export const SharedRecipeListCard = ({recipe}: Props) => {
  const openRecipe = () => {
    const url = buildRecipePermalink(WEB_APP_BASE_URL, recipe);
    void Linking.openURL(url);
  };

  return (
    <TouchableOpacity
      className="
        mb-3 flex-row items-center gap-3 rounded-xl bg-white p-4 shadow-sm
      "
      onPress={openRecipe}
    >
      <RecipeThumbnail recipe={recipe} />
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-gray-900">
          {recipe.title}
        </Text>
        <Text className="text-muted mt-1 text-sm">
          {recipe.servings} servings
          {recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
