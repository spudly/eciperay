import {makeRecipeDetail} from '@eciperay/client';
import {eciperayTheme, tokens} from '@spudly/ui';
import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

type Props = {recipe: RecipeDetail};

/**
 * This tab renders without a TamaguiProvider (its unit test uses a plain
 * render), so cards stay on RN primitives with every visual value sourced from
 * @spudly/ui tokens — the BookLoadingSpinner pattern. The active card's wash is
 * the semantic primary at 5% alpha (the old bg-primary/5), composed with an
 * alpha suffix the way TagPill composes data colors.
 */
const styles = {
  container: {padding: tokens.spacing[4]} as const,
  card: {
    marginBottom: tokens.spacing[3],
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    padding: tokens.spacing[4],
  } as const,
  cardActive: {
    borderColor: eciperayTheme.semantic.primary,
    backgroundColor: `${eciperayTheme.semantic.primary}0d`,
  } as const,
  cardInactive: {
    borderColor: tokens.colors.gray.gray2,
    backgroundColor: eciperayTheme.semantic.surface,
  } as const,
  stepLabel: {
    marginBottom: tokens.spacing[1],
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.semibold,
  } as const,
  stepLabelActive: {color: eciperayTheme.semantic.primary} as const,
  stepLabelInactive: {color: eciperayTheme.semantic.textMuted} as const,
  body: {
    fontSize: tokens.typography.fontSize.md,
    color: eciperayTheme.semantic.text,
  } as const,
};

const StepCard = ({
  step,
  isActive,
  onPress,
}: {
  step: RecipeDetail['instructions'][number];
  isActive: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.card, isActive ? styles.cardActive : styles.cardInactive]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.stepLabel,
        isActive ? styles.stepLabelActive : styles.stepLabelInactive,
      ]}
    >
      Step {step.stepNumber}
    </Text>
    <Text style={styles.body}>{step.body}</Text>
  </TouchableOpacity>
);

export const InstructionsTab = ({recipe}: Props) => {
  const [activeStep, setActiveStep] = useState(0);
  const sorted = [...recipe.instructions].sort(
    (a, b) => a.stepNumber - b.stepNumber,
  );
  return (
    <View style={styles.container}>
      {sorted.map((step, i) => (
        <StepCard
          key={step.id}
          step={step}
          isActive={i === activeStep}
          onPress={() => {
            setActiveStep(i);
          }}
        />
      ))}
    </View>
  );
};

if (__DEV__) {
  InstructionsTab.demo = () => <InstructionsTab recipe={makeRecipeDetail()} />;
}
