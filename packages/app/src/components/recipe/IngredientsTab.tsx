import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import type {RecipeDetail, Ingredient} from '@recipoo/types';

import {scaleQuantity} from '../../lib/scaleQuantity';

type Props = {
  recipe: RecipeDetail;
  scaleFactor: number;
  servings: number;
  onServingsChange: (s: number) => void;
};

const ServingsStepper = ({
  servings,
  onChange,
}: {
  servings: number;
  onChange: (n: number) => void;
}) => (
  <View className="flex-row items-center gap-3 mb-4">
    <Text className="text-sm font-medium text-gray-700">Servings:</Text>
    <TouchableOpacity
      className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
      onPress={() => {
        onChange(Math.max(1, servings - 1));
      }}
    >
      <Text className="text-lg font-medium">−</Text>
    </TouchableOpacity>
    <Text className="text-base font-semibold w-6 text-center">{servings}</Text>
    <TouchableOpacity
      className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
      onPress={() => {
        onChange(servings + 1);
      }}
    >
      <Text className="text-lg font-medium">+</Text>
    </TouchableOpacity>
  </View>
);

const IngredientRow = ({
  ingredient,
  scaleFactor,
  missing,
  onToggle,
}: {
  ingredient: Ingredient;
  scaleFactor: number;
  missing: boolean;
  onToggle: () => void;
}) => (
  <TouchableOpacity
    className={`flex-row items-center py-3 border-b border-gray-100 ${missing ? 'opacity-40' : ''}`}
    onLongPress={onToggle}
  >
    <Text className="flex-1 text-base text-gray-900">
      {scaleQuantity(ingredient.quantity, ingredient.unit, scaleFactor)}{' '}
      {ingredient.name}
    </Text>
    {ingredient.isOptional ? (
      <Text className="text-xs text-muted ml-2">optional</Text>
    ) : null}
  </TouchableOpacity>
);

const toggleSet = (id: string, prev: Set<string>): Set<string> => {
  const next = new Set(prev);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

export const IngredientsTab = ({
  recipe,
  scaleFactor,
  servings,
  onServingsChange,
}: Props) => {
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    setMissing(prev => toggleSet(id, prev));
  };
  return (
    <View className="p-4">
      <ServingsStepper
        servings={servings}
        onChange={onServingsChange}
      />
      {recipe.ingredients.map(ing => (
        <IngredientRow
          key={ing.id}
          ingredient={ing}
          scaleFactor={scaleFactor}
          missing={missing.has(ing.id)}
          onToggle={() => {
            toggle(ing.id);
          }}
        />
      ))}
      {missing.size > 0 ? (
        <Text className="text-sm text-muted mt-3">
          Long-press an ingredient to mark it missing. Go to Notes tab to get
          substitutions.
        </Text>
      ) : null}
    </View>
  );
};
