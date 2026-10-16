/* eslint-disable max-lines -- ingredients tab with substitutions panel and showcase demo */
import {
  formatScaledIngredientLine,
  makeRecipeDetail,
  queryKeys,
  sortIngredientsByOrder,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import {useQuery} from '@tanstack/react-query';
import React, {useState} from 'react';
import {TouchableOpacity} from 'react-native';
import {YStack} from 'tamagui';
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

/**
 * Pressable rows stay on RN TouchableOpacity (the Stage 2 pressable precedent);
 * the row's visual values come from @spudly/ui tokens.
 */
const rowStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  borderBottomWidth: 1,
  borderColor: tokens.colors.gray.gray2,
  paddingVertical: tokens.spacing[3],
} as const;

const rowMissingStyle = {opacity: 0.4} as const;

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
    style={[rowStyle, missing ? rowMissingStyle : undefined]}
    onPress={onToggle}
  >
    <DsText flex={1}>
      {formatScaledIngredientLine(ingredient, scaleFactor)}
    </DsText>
    {ingredient.isOptional ? (
      <DsText
        fontSize={tokens.typography.fontSize.xs}
        color="$textMuted"
        marginInlineStart="$2"
      >
        optional
      </DsText>
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
    <YStack padding="$4">
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
        <DsText
          variant="hint"
          marginBlockStart="$3"
        >
          Tap an ingredient to mark it missing and see substitutions below.
        </DsText>
      ) : null}
      {missingNames.length > 0 && substitutionsLoading ? (
        <DsText
          variant="hint"
          marginBlockStart="$4"
        >
          Finding substitutions…
        </DsText>
      ) : null}
      {substitutions.length > 0 ? (
        <YStack
          marginBlockStart="$4"
          borderRadius={tokens.radii.lg}
          backgroundColor="$primarySubtle"
          padding="$4"
        >
          <DsText
            fontSize={tokens.typography.fontSize.sm}
            fontWeight={tokens.typography.fontWeight.semibold}
            color="$primaryEmphasis"
            marginBlockEnd="$2"
          >
            Substitutions
          </DsText>
          {substitutions.map(sub => (
            <YStack
              key={sub.ingredient}
              marginBlockEnd="$2"
            >
              <DsText
                fontSize={tokens.typography.fontSize.sm}
                fontWeight={tokens.typography.fontWeight.medium}
              >
                {sub.ingredient}
              </DsText>
              <DsText
                fontSize={tokens.typography.fontSize.sm}
                color={tokens.colors.gray.gray7}
              >
                {sub.suggestions.join(', ')}
              </DsText>
            </YStack>
          ))}
        </YStack>
      ) : null}
    </YStack>
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
