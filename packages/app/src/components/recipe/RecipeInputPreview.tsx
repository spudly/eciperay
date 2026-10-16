import {
  formatScaledIngredientLine,
  makeRecipeDetail,
  recipeDetailToInput,
  sortedPreviewIngredients,
  sortedPreviewInstructions,
} from '@eciperay/client';
import type {RecipeVersionInput} from '@eciperay/types';
import {eciperayTheme, tokens} from '@spudly/ui';
import React from 'react';
import {ScrollView, Text, View} from 'react-native';

type Props = {recipe: RecipeVersionInput};

const formatTime = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) {
    return null;
  }
  return `${minutes} min`;
};

/**
 * This preview renders without a TamaguiProvider (its unit test uses a plain
 * render), so it stays on RN primitives with every visual value sourced from
 * @spudly/ui tokens — the BookLoadingSpinner pattern. The scroll cap (384) is
 * layout geometry from the old max-block-96, with no step on the DS spacing
 * scale.
 */
const styles = {
  scroll: {maxHeight: 384} as const,
  container: {gap: tokens.spacing[4]} as const,
  title: {
    fontSize: tokens.typography.fontSize.md,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: eciperayTheme.semantic.text,
  } as const,
  description: {
    marginTop: tokens.spacing[1],
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray.gray7,
  } as const,
  meta: {
    color: eciperayTheme.semantic.textMuted,
    marginTop: tokens.spacing[2],
    fontSize: tokens.typography.fontSize.xs,
  } as const,
  sectionTitle: {
    marginBottom: tokens.spacing[1],
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: eciperayTheme.semantic.text,
  } as const,
  line: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray.gray9,
  } as const,
  instructionLine: {
    marginBottom: tokens.spacing[2],
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray.gray9,
  } as const,
};

export const RecipeInputPreview = ({recipe}: Props) => {
  const prep = formatTime(recipe.prepTimeMin);
  const cook = formatTime(recipe.cookTimeMin);
  const ingredients = sortedPreviewIngredients(recipe);
  const instructions = sortedPreviewInstructions(recipe);

  return (
    <ScrollView style={styles.scroll}>
      <View style={styles.container}>
        <View>
          <Text style={styles.title}>{recipe.title}</Text>
          {recipe.description ? (
            <Text style={styles.description}>{recipe.description}</Text>
          ) : null}
          <Text style={styles.meta}>
            Serves {recipe.servings}
            {prep ? ` · Prep ${prep}` : ''}
            {cook ? ` · Cook ${cook}` : ''}
          </Text>
        </View>
        {ingredients.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {ingredients.map(ingredient => (
              <Text
                key={`${ingredient.sortOrder}-${ingredient.name}`}
                style={styles.line}
              >
                · {formatScaledIngredientLine(ingredient, 1)}
              </Text>
            ))}
          </View>
        ) : null}
        {instructions.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {instructions.map(instruction => (
              <Text
                key={instruction.stepNumber}
                style={styles.instructionLine}
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

if (__DEV__) {
  RecipeInputPreview.demo = () => (
    <RecipeInputPreview recipe={recipeDetailToInput(makeRecipeDetail())} />
  );
}
