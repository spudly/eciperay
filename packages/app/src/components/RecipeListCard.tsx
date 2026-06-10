import React from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import type {RecipeDetail} from '@recipoo/types';

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

type Props = {recipe: RecipeDetail; onPress: () => void; onDelete: () => void};

export const RecipeListCard = ({recipe, onPress, onDelete}: Props) => (
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
