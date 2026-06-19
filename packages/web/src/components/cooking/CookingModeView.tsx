import clsx from 'clsx';
import type {RecipeDetail} from '@eciperay/types';

import {ProgressDots} from './ProgressDots.js';
import {ScaledIngredientsList} from './ScaledIngredientsList.js';

type Props = {
  displayRecipe: RecipeDetail | undefined;
  steps: RecipeDetail['instructions'];
  step: number;
  scaleFactor: number;
  servings: number;
  onDone: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export const CookingModeView = ({
  displayRecipe,
  steps,
  step,
  scaleFactor,
  servings,
  onDone,
  onPrev,
  onNext,
}: Props) => {
  const current = steps[step];

  return (
    <div className="fixed inset-0 flex flex-col justify-center bg-gray-900 px-6">
      <button
        type="button"
        className="
          absolute right-6 top-6 rounded-full bg-white/10 px-4 py-2 text-sm
          text-white
        "
        onClick={onDone}
      >
        Done
      </button>
      <p className="mb-4 text-sm uppercase tracking-widest text-white/60">
        Step {current ? current.stepNumber : 1} of {steps.length}
      </p>
      {displayRecipe ? (
        <ScaledIngredientsList
          recipe={displayRecipe}
          scaleFactor={scaleFactor}
          servings={servings}
        />
      ) : null}
      <p className="mb-8 text-2xl leading-relaxed text-white">
        {current ? current.body : ''}
      </p>
      <ProgressDots
        total={steps.length}
        current={step}
      />
      <div className="flex justify-between">
        <button
          type="button"
          className={clsx(
            `rounded-xl bg-white/10 px-6 py-3 text-base text-white`,
            {'opacity-30': step === 0},
          )}
          disabled={step === 0}
          onClick={onPrev}
        >
          ← Back
        </button>
        <button
          type="button"
          className={clsx(
            `rounded-xl bg-white/10 px-6 py-3 text-base text-white`,
            {'opacity-30': step === steps.length - 1},
          )}
          disabled={step === steps.length - 1}
          onClick={onNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
};
