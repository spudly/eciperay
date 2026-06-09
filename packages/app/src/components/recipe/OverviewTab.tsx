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
  <View className="mb-4 flex-row gap-3">
    <TouchableOpacity
      className="flex-1 items-center rounded-xl bg-primary py-3"
      onPress={onStartCooking}
    >
      <Text className="font-semibold text-white">Start Cooking</Text>
    </TouchableOpacity>
    <TouchableOpacity
      className="w-12 items-center justify-center rounded-xl bg-gray-100"
      onPress={() => void printRecipe(recipe)}
    >
      <Text className="text-gray-700">🖨</Text>
    </TouchableOpacity>
    <TouchableOpacity
      className="w-12 items-center justify-center rounded-xl bg-gray-100"
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
        className="mb-4 h-48 w-full rounded-xl"
        resizeMode="cover"
      />
    ) : null}
    <Text className="mb-2 text-2xl font-bold text-gray-900">
      {recipe.title}
    </Text>
    {recipe.description ? (
      <Text className="mb-4 text-gray-600">{recipe.description}</Text>
    ) : null}
    <View className="mb-4 flex-row justify-around rounded-xl bg-gray-50 py-4">
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
          className="rounded-full px-3 py-1"
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
