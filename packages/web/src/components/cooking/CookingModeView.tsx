import type {ReactNode} from 'react';
import {
  formatScaledIngredientLine,
  formatServingsLabel,
  sortIngredientsByOrder,
} from '@eciperay/client';
import type {RecipeDetail} from '@eciperay/types';
import {CookingModePage} from '@spudly/ui';

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

/**
 * Cooking mode is a design-system page in @spudly/ui 6.x (CookingModePage
 * composes the step overlay, dots, and prev/next navigation internally). This
 * host view keeps the pre-migration component seam for the page host: it maps
 * the loaded recipe and step state onto the page's data contract, pre-composing
 * the scaled-ingredients panel (heading + lines) from the same client
 * formatters the retired host list used.
 */
export const CookingModeView = ({
  displayRecipe,
  steps,
  step,
  scaleFactor,
  servings,
  onDone,
  onPrev,
  onNext,
}: Props) => (
  <CookingModePage
    recipeTitle={displayRecipe ? displayRecipe.title : ''}
    steps={steps.map(instruction => ({
      stepNumber: instruction.stepNumber,
      body: instruction.body,
    }))}
    stepIndex={step}
    ingredients={
      displayRecipe
        ? {
            heading: `Ingredients${
              scaleFactor === 1
                ? ` (${formatServingsLabel(servings)})`
                : ` (scaled to ${formatServingsLabel(servings)})`
            }`,
            lines: sortIngredientsByOrder(displayRecipe.ingredients).map(
              ingredient => formatScaledIngredientLine(ingredient, scaleFactor),
            ),
          }
        : null
    }
    onDone={onDone}
    onPrev={onPrev}
    onNext={onNext}
  />
);
