import type {MealCookingModeViewProps} from '@eciperay/client';
import {Pressable, Text, View} from 'react-native';

import {PrevNextNav} from '../ui/PrevNextNav';
import {ProgressDots} from '../ui/ProgressDots';

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
    <View className="ui-cooking-mode-overlay-fixed flex-1">
      <Pressable
        className="ui-cooking-mode-done-button"
        onPress={onDone}
      >
        <Text className="text-sm text-white">Done</Text>
      </Pressable>
      <Text className="mb-2 text-sm uppercase tracking-widest text-white/60">
        {mealTitle}
      </Text>
      <Text className="mb-4 text-sm uppercase tracking-widest text-white/60">
        Step {current.stepNumber} of {steps.length} · {current.recipeTitle}
      </Text>
      <Text className="mb-8 text-2xl leading-relaxed text-white">
        {current.body}
      </Text>
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
    </View>
  );
};
