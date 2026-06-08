import React from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import type {RecipeDetail} from '@recipoo/types';

import {printRecipe} from '../../lib/printRecipe';
import {shareRecipe} from '../../lib/shareRecipe';

type Props = {recipe: RecipeDetail; onStartCooking: () => void};

const StatBadge = ({label, value}: {label: string; value: string}) => (
  <View className="items-center">
    <Text className="text-base font-semibold text-gray-900">{value}</Text>
    <Text className="text-xs text-muted">{label}</Text>
  </View>
);

const ActionRow = ({
  recipe,
  onStartCooking,
}: {
  recipe: RecipeDetail;
  onStartCooking: () => void;
}) => (
  <View className="flex-row gap-3 mb-4">
    <TouchableOpacity
      className="flex-1 bg-primary rounded-xl py-3 items-center"
      onPress={onStartCooking}
    >
      <Text className="text-white font-semibold">Start Cooking</Text>
    </TouchableOpacity>
    <TouchableOpacity
      className="w-12 bg-gray-100 rounded-xl items-center justify-center"
      onPress={() => void printRecipe(recipe)}
    >
      <Text className="text-gray-700">🖨</Text>
    </TouchableOpacity>
    <TouchableOpacity
      className="w-12 bg-gray-100 rounded-xl items-center justify-center"
      onPress={() => void shareRecipe(recipe)}
    >
      <Text className="text-gray-700">↗</Text>
    </TouchableOpacity>
  </View>
);

export const OverviewTab = ({recipe, onStartCooking}: Props) => (
  <View className="p-4">
    {recipe.imageUrl ? (
      <Image
        source={{uri: recipe.imageUrl}}
        className="w-full h-48 rounded-xl mb-4"
        resizeMode="cover"
      />
    ) : null}
    <Text className="text-2xl font-bold text-gray-900 mb-2">
      {recipe.title}
    </Text>
    {recipe.description ? (
      <Text className="text-gray-600 mb-4">{recipe.description}</Text>
    ) : null}
    <View className="flex-row justify-around bg-gray-50 rounded-xl py-4 mb-4">
      <StatBadge
        label="Servings"
        value={String(recipe.servings)}
      />
      {recipe.prepTimeMin ? (
        <StatBadge
          label="Prep"
          value={`${recipe.prepTimeMin}m`}
        />
      ) : null}
      {recipe.cookTimeMin ? (
        <StatBadge
          label="Cook"
          value={`${recipe.cookTimeMin}m`}
        />
      ) : null}
    </View>
    <ActionRow
      recipe={recipe}
      onStartCooking={onStartCooking}
    />
    <View className="flex-row flex-wrap gap-2">
      {recipe.tags.map(tag => (
        <View
          key={tag.id}
          className="px-3 py-1 rounded-full"
          style={{backgroundColor: `${tag.color}22`}}
        >
          <Text
            className="text-xs font-medium"
            style={{color: tag.color}}
          >
            {tag.name}
          </Text>
        </View>
      ))}
    </View>
  </View>
);
