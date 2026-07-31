import {
  formatScaledIngredientLine,
  makeRecipeDetail,
  queryKeys,
  sortIngredientsByOrder,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import clsx from 'clsx';
import {useQuery} from '@tanstack/react-query';
import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import type {Ingredient, RecipeDetail} from '@eciperay/types';

import {api} from '../../lib/api';

import {ScaleMultiplierButtons} from './ScaleMultiplierButtons';
import {ServingsStepper} from './ServingsStepper';

type Props = {
  recipe: RecipeDetail;
  scaleFactor: number;
  servings: number;
  onServingsChange: (s: number) => void;
};

const toggleSet = (id: string, prev: Set<string>): Set<string> => {
  const next = new Set(prev);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

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
    className={clsx('flex-row items-center border-b border-gray-100 py-3', {
      'opacity-40': missing,
    })}
    onPress={onToggle}
  >
    <Text className="flex-1 text-base text-gray-900">
      {formatScaledIngredientLine(ingredient, scaleFactor)}
    </Text>
    {ingredient.isOptional ? (
      <Text className="text-muted ms-2 text-xs">optional</Text>
    ) : null}
  </TouchableOpacity>
);

export const IngredientsTab = ({
  recipe,
  scaleFactor,
  servings,
  onServingsChange,
}: Props) => {
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const missingNames = recipe.ingredients
    .filter(ing => missing.has(ing.id))
    .map(ing => ing.name);

  const {data: substitutions = [], isFetching: substitutionsLoading} = useQuery(
    {
      queryKey: [...queryKeys.recipe(recipe.id), 'substitutions', missingNames],
      queryFn: () => api.ai.substitutions(recipe.id, missingNames),
      enabled: missingNames.length > 0,
    },
  );

  const toggle = (id: string) => {
    setMissing(prev => toggleSet(id, prev));
  };

  return (
    <View className="p-4">
      <ServingsStepper
        servings={servings}
        onChange={onServingsChange}
      />
      <ScaleMultiplierButtons
        baseServings={recipe.servings}
        servings={servings}
        onServingsChange={onServingsChange}
      />
      {sortIngredientsByOrder(recipe.ingredients).map(ing => (
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
        <Text className="text-muted mt-3 text-sm">
          Tap an ingredient to mark it missing and see substitutions below.
        </Text>
      ) : null}
      {missingNames.length > 0 && substitutionsLoading ? (
        <Text className="text-muted mt-4 text-sm">Finding substitutions…</Text>
      ) : null}
      {substitutions.length > 0 ? (
        <View className="mt-4 rounded-xl bg-blue-50 p-4">
          <Text className="mb-2 text-sm font-semibold text-blue-900">
            Substitutions
          </Text>
          {substitutions.map(sub => (
            <View
              key={sub.ingredient}
              className="mb-2"
            >
              <Text className="text-sm font-medium text-gray-900">
                {sub.ingredient}
              </Text>
              <Text className="text-sm text-gray-600">
                {sub.suggestions.join(', ')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

if (__DEV__) {
  const IngredientsTabDemo = () => {
    const [servings, setServings] = useState(4);
    const recipe = makeRecipeDetail();
    return (
      <IngredientsTab
        recipe={recipe}
        scaleFactor={1}
        servings={servings}
        onServingsChange={setServings}
      />
    );
  };

  const ingredientsTabDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <IngredientsTabDemo />
    </Frame>
  );
  IngredientsTab.demo = ingredientsTabDemo;
}
