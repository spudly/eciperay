import {
  formatScaledIngredientLine,
  sortedPreviewIngredients,
  sortedPreviewInstructions,
} from '@eciperay/client';
import type {RecipeVersionInput} from '@eciperay/types';
import React from 'react';
import {ScrollView, Text, View} from 'react-native';

type Props = {recipe: RecipeVersionInput};

const formatTime = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) {
    return null;
  }
  return `${minutes} min`;
};

export const RecipeInputPreview = ({recipe}: Props) => {
  const prep = formatTime(recipe.prepTimeMin);
  const cook = formatTime(recipe.cookTimeMin);
  const ingredients = sortedPreviewIngredients(recipe);
  const instructions = sortedPreviewInstructions(recipe);

  return (
    <ScrollView className="max-h-96">
      <View className="gap-4">
        <View>
          <Text className="text-base font-semibold text-gray-900">
            {recipe.title}
          </Text>
          {recipe.description ? (
            <Text className="mt-1 text-sm text-gray-600">
              {recipe.description}
            </Text>
          ) : null}
          <Text className="text-muted mt-2 text-xs">
            Serves {recipe.servings}
            {prep ? ` · Prep ${prep}` : ''}
            {cook ? ` · Cook ${cook}` : ''}
          </Text>
        </View>
        {ingredients.length > 0 ? (
          <View>
            <Text className="mb-1 text-sm font-medium text-gray-900">
              Ingredients
            </Text>
            {ingredients.map(ingredient => (
              <Text
                key={`${ingredient.sortOrder}-${ingredient.name}`}
                className="text-sm text-gray-800"
              >
                · {formatScaledIngredientLine(ingredient, 1)}
              </Text>
            ))}
          </View>
        ) : null}
        {instructions.length > 0 ? (
          <View>
            <Text className="mb-1 text-sm font-medium text-gray-900">
              Instructions
            </Text>
            {instructions.map(instruction => (
              <Text
                key={instruction.stepNumber}
                className="mb-2 text-sm text-gray-800"
              >
                {instruction.stepNumber}. {instruction.body}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
};
