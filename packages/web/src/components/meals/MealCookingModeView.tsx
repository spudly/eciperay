import type {MealCookingModeViewProps} from '@eciperay/client';
import {YStack} from 'tamagui';

import {PrevNextNav} from '../ui/PrevNextNav.js';
import {ProgressDots} from '../ui/ProgressDots.js';

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
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      flexDirection="column"
      justifyContent="center"
      backgroundColor="#111827"
      paddingHorizontal="$6"
    >
      <button
        type="button"
        style={{
          position: 'absolute',
          right: 24,
          top: 48,
          borderRadius: 9999,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 8,
          paddingBottom: 8,
          fontSize: 14,
          color: '#ffffff',
        }}
        onClick={onDone}
      >
        Done
      </button>
      <p className="mbe-2 text-sm tracking-widest text-white/60 uppercase">
        {mealTitle}
      </p>
      <p className="mbe-4 text-sm tracking-widest text-white/60 uppercase">
        Step {current.stepNumber} of {steps.length} · {current.recipeTitle}
      </p>
      <p className="mbe-8 text-2xl/relaxed text-white">{current.body}</p>
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
