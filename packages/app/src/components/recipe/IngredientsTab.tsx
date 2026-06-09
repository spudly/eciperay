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
  <View className="mb-4 flex-row items-center gap-3">
    <Text className="text-sm font-medium text-gray-700">Servings:</Text>
    <TouchableOpacity
      className="size-8 items-center justify-center rounded-full bg-gray-100"
      onPress={() => {
        onChange(Math.max(1, servings - 1));
      }}
    >
      <Text className="text-lg font-medium">−</Text>
    </TouchableOpacity>
    <Text className="w-6 text-center text-base font-semibold">{servings}</Text>
    <TouchableOpacity
      className="size-8 items-center justify-center rounded-full bg-gray-100"
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
    className={`
      flex-row items-center border-b border-gray-100 py-3
      ${missing ? `opacity-40` : ''}
    `}
    onLongPress={onToggle}
  >
    <Text className="flex-1 text-base text-gray-900">
      {scaleQuantity(ingredient.quantity, ingredient.unit, scaleFactor)}{' '}
      {ingredient.name}
    </Text>
    {ingredient.isOptional ? (
      <Text className="ms-2 text-xs text-muted">optional</Text>
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
        <Text className="mt-3 text-sm text-muted">
          Long-press an ingredient to mark it missing. Go to Notes tab to get
          substitutions.
        </Text>
      ) : null}
    </View>
  );
};
