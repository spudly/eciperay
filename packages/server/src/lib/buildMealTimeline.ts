import type {MealTimelineStep} from '@eciperay/types';

export type TimelineInstructionInput = {
  recipeId: string;
  recipeTitle: string;
  recipeSortOrder: number;
  instructionId: string;
  stepNumber: number;
  body: string;
  durationMin: number;
};

export const buildMealTimeline = (
  instructions: TimelineInstructionInput[],
): {totalDurationMin: number; steps: MealTimelineStep[]} => {
  const byRecipe = new Map<string, TimelineInstructionInput[]>();
  const sortOrderByRecipeId = new Map<string, number>();
  for (const instruction of instructions) {
    sortOrderByRecipeId.set(instruction.recipeId, instruction.recipeSortOrder);
    const list = byRecipe.get(instruction.recipeId) ?? [];
    list.push(instruction);
    byRecipe.set(instruction.recipeId, list);
  }

  const recipeDurations = new Map<string, number>();
  for (const [recipeId, steps] of byRecipe) {
    steps.sort((a, b) => a.stepNumber - b.stepNumber);
    recipeDurations.set(
      recipeId,
      steps.reduce((sum, step) => sum + step.durationMin, 0),
    );
  }

  const totalDurationMin = Math.max(0, ...recipeDurations.values());
  const steps: MealTimelineStep[] = [];

  for (const [recipeId, recipeSteps] of byRecipe) {
    /* c8 ignore next -- recipeId always comes from the map we just filled */
    const recipeDuration = recipeDurations.get(recipeId) ?? 0;
    let cursor = totalDurationMin - recipeDuration;
    for (const step of recipeSteps) {
      const startOffsetMin = cursor;
      const endOffsetMin = cursor + step.durationMin;
      steps.push({
        recipeId,
        recipeTitle: step.recipeTitle,
        instructionId: step.instructionId,
        stepNumber: step.stepNumber,
        body: step.body,
        durationMin: step.durationMin,
        startOffsetMin,
        endOffsetMin,
      });
      cursor = endOffsetMin;
    }
  }

  steps.sort((a, b) => {
    if (a.startOffsetMin !== b.startOffsetMin) {
      return a.startOffsetMin - b.startOffsetMin;
    }
    /* c8 ignore next 2 -- recipe ids on steps always come from instructions above */
    const aOrder = sortOrderByRecipeId.get(a.recipeId) ?? 0;
    const bOrder = sortOrderByRecipeId.get(b.recipeId) ?? 0;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.stepNumber - b.stepNumber;
  });

  return {totalDurationMin, steps};
};
