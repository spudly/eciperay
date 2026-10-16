import type {MealCookingModeViewProps} from '@eciperay/client';
import {eciperayTheme, Text as DsText, tokens} from '@spudly/ui';
import {Pressable} from 'react-native';
import {YStack} from 'tamagui';

import {PrevNextNav} from '../ui/PrevNextNav';
import {ProgressDots} from '../ui/ProgressDots';

/**
 * G9: the meal cooking-mode overlay is the ui-cooking-mode-overlay-fixed
 * composite — an absolutely positioned full-screen dark shell (the old `fixed
 * inset-0 flex flex-col justify-center bg-gray-900 px-6`), composed from
 * @spudly/ui tokens. The overlay's "white" is the DS semantic surface; white/60
 * is composed with a hex alpha suffix ('99'). tracking-widest (0.1em) at
 * text-sm is 1.4px of letterSpacing geometry.
 */
const WHITE = eciperayTheme.semantic.surface;

/* The old ui-cooking-mode-done-button: absolute right-6 top-12, full radius,
   white/10 fill, px-4 py-2. */
const doneButtonStyle = {
  position: 'absolute',
  right: tokens.spacing[6],
  top: tokens.spacing[12],
  borderRadius: tokens.radii.full,
  backgroundColor: `${WHITE}1a`,
  paddingHorizontal: tokens.spacing[4],
  paddingVertical: tokens.spacing[2],
} as const;

export const MealCookingModeView = ({
  plan,
  mealTitle,
  stepIndex,
  onPrev,
  onNext,
  onDone,
}: MealCookingModeViewProps) => {
  const steps = plan.steps;
  const current = steps.at(stepIndex);
  if (current === undefined) {
    return null;
  }

  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      justifyContent="center"
      backgroundColor={tokens.colors.gray.gray10}
      paddingHorizontal="$6"
    >
      <Pressable
        style={doneButtonStyle}
        onPress={onDone}
      >
        <DsText
          fontSize={tokens.typography.fontSize.sm}
          color={WHITE}
        >
          Done
        </DsText>
      </Pressable>
      <DsText
        marginBlockEnd="$2"
        fontSize={tokens.typography.fontSize.sm}
        letterSpacing={1.4}
        color={`${WHITE}99`}
        textTransform="uppercase"
      >
        {mealTitle}
      </DsText>
      <DsText
        marginBlockEnd="$4"
        fontSize={tokens.typography.fontSize.sm}
        letterSpacing={1.4}
        color={`${WHITE}99`}
        textTransform="uppercase"
      >
        Step {current.stepNumber} of {steps.length} · {current.recipeTitle}
      </DsText>
      <DsText
        marginBlockEnd="$8"
        fontSize={tokens.typography.fontSize['2xl']}
        lineHeight={
          tokens.typography.fontSize['2xl'] *
          tokens.typography.lineHeight.relaxed
        }
        color={WHITE}
      >
        {current.body}
      </DsText>
      <ProgressDots
        total={steps.length}
        current={stepIndex}
      />
      <PrevNextNav
        onBack={onPrev}
        onNext={onNext}
        disableBack={stepIndex === 0}
        disableNext={stepIndex >= steps.length - 1}
      />
    </YStack>
  );
};
