import type {ReactNode} from 'react';
import type {RecipeDetail} from '@eciperay/types';

import {PrevNextNav} from '../ui/PrevNextNav.js';
import {ProgressDots} from '../ui/ProgressDots.js';

import {ScaledIngredientsList} from './ScaledIngredientsList.js';

export const CookingModeCookLogShell = ({children}: {children: ReactNode}) => (
  <div
    className="ui-cooking-mode-overlay-fixed ui-cooking-mode-overlay-centered"
  >
    {children}
  </div>
);

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
    <div className="ui-cooking-mode-overlay-fixed">
      <button
        type="button"
        className="ui-cooking-mode-done-button text-sm text-white"
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
      <PrevNextNav
        onBack={onPrev}
        onNext={onNext}
        disableBack={step === 0}
        disableNext={step === steps.length - 1}
      />
    </div>
  );
};
