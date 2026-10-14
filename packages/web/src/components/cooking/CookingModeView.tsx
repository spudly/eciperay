import type {ReactNode} from 'react';
import type {RecipeDetail} from '@eciperay/types';
import {YStack} from 'tamagui';

import {PrevNextNav} from '../ui/PrevNextNav.js';
import {ProgressDots} from '../ui/ProgressDots.js';

import {ScaledIngredientsList} from './ScaledIngredientsList.js';

export const CookingModeCookLogShell = ({children}: {children: ReactNode}) => (
  <div
    style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111827',
        paddingLeft: 24,
        paddingRight: 24,
      }}
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
      <p className="mbe-4 text-sm tracking-widest text-white/60 uppercase">
        Step {current ? current.stepNumber : 1} of {steps.length}
      </p>
      {displayRecipe ? (
        <ScaledIngredientsList
          recipe={displayRecipe}
          scaleFactor={scaleFactor}
          servings={servings}
        />
      ) : null}
      <p className="mbe-8 text-2xl/relaxed text-white">
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
    </YStack>
  );
};
