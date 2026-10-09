import type {MealCookingModeViewProps} from '@eciperay/client';

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
    <div className="ui-cooking-mode-overlay-fixed">
      <button
        type="button"
        className="ui-cooking-mode-done-button text-sm text-white"
        onClick={onDone}
      >
        Done
      </button>
      <p className="mb-2 text-sm uppercase tracking-widest text-white/60">
        {mealTitle}
      </p>
      <p className="mb-4 text-sm uppercase tracking-widest text-white/60">
        Step {current.stepNumber} of {steps.length} · {current.recipeTitle}
      </p>
      <p className="mb-8 text-2xl leading-relaxed text-white">{current.body}</p>
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
    </div>
  );
};
