import type {
  AggregatedNutrition,
  AggregatedNutritionStatus,
  MealPlanNutrition,
} from '@eciperay/types';

import {calculateSatiety} from './satiety.js';

export type RecipePortionNutritionInput = {
  servings: number;
  recipeServings: number;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  preparedWeightG: number | null;
  nutritionStatus: string | null;
  accessLost?: boolean;
};

type MacroTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  preparedWeightG: number;
};

const emptyTotals = (): MacroTotals => ({
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0,
  preparedWeightG: 0,
});

export const isReadyPortion = (portion: RecipePortionNutritionInput): boolean =>
  !portion.accessLost &&
  portion.nutritionStatus === 'ready' &&
  typeof portion.calories === 'number' &&
  typeof portion.proteinG === 'number' &&
  typeof portion.carbsG === 'number' &&
  typeof portion.fatG === 'number' &&
  typeof portion.preparedWeightG === 'number' &&
  portion.recipeServings > 0;

export const scalePortion = (
  portion: RecipePortionNutritionInput,
): MacroTotals => {
  const scale = portion.servings / portion.recipeServings;
  return {
    calories: (portion.calories ?? 0) * scale,
    proteinG: (portion.proteinG ?? 0) * scale,
    carbsG: (portion.carbsG ?? 0) * scale,
    fatG: (portion.fatG ?? 0) * scale,
    fiberG: (portion.fiberG ?? 0) * scale,
    sugarG: (portion.sugarG ?? 0) * scale,
    sodiumMg: (portion.sodiumMg ?? 0) * scale,
    preparedWeightG: (portion.preparedWeightG ?? 0) * scale,
  };
};

const addTotals = (a: MacroTotals, b: MacroTotals): MacroTotals => ({
  calories: a.calories + b.calories,
  proteinG: a.proteinG + b.proteinG,
  carbsG: a.carbsG + b.carbsG,
  fatG: a.fatG + b.fatG,
  fiberG: a.fiberG + b.fiberG,
  sugarG: a.sugarG + b.sugarG,
  sodiumMg: a.sodiumMg + b.sodiumMg,
  preparedWeightG: a.preparedWeightG + b.preparedWeightG,
});

const multiplyTotals = (
  totals: MacroTotals,
  quantity: number,
): MacroTotals => ({
  calories: totals.calories * quantity,
  proteinG: totals.proteinG * quantity,
  carbsG: totals.carbsG * quantity,
  fatG: totals.fatG * quantity,
  fiberG: totals.fiberG * quantity,
  sugarG: totals.sugarG * quantity,
  sodiumMg: totals.sodiumMg * quantity,
  preparedWeightG: totals.preparedWeightG * quantity,
});

const divideTotals = (totals: MacroTotals, divisor: number): MacroTotals =>
  multiplyTotals(totals, 1 / divisor);

const resolveStatus = (
  totalCount: number,
  contributingCount: number,
): AggregatedNutritionStatus => {
  if (totalCount === 0 || contributingCount === 0) {
    return 'unavailable';
  }
  if (contributingCount < totalCount) {
    return 'partial';
  }
  return 'ready';
};

const satietyForTotals = (totals: MacroTotals): number | null => {
  if (totals.preparedWeightG <= 0) {
    return null;
  }
  return calculateSatiety({
    calories: totals.calories,
    protein: totals.proteinG,
    fat: totals.fatG,
    totalCarbs: totals.carbsG,
    fiber: totals.fiberG,
    sugar: totals.sugarG,
    sodium: totals.sodiumMg,
    weight: totals.preparedWeightG,
  }).score;
};

export const toAggregatedNutrition = (
  totals: MacroTotals,
  status: AggregatedNutritionStatus,
): AggregatedNutrition => ({
  ...totals,
  satietyScore: status === 'unavailable' ? null : satietyForTotals(totals),
  status,
});

const totalsFromAggregated = (nutrition: AggregatedNutrition): MacroTotals => ({
  calories: nutrition.calories,
  proteinG: nutrition.proteinG,
  carbsG: nutrition.carbsG,
  fatG: nutrition.fatG,
  fiberG: nutrition.fiberG,
  sugarG: nutrition.sugarG,
  sodiumMg: nutrition.sodiumMg,
  preparedWeightG: nutrition.preparedWeightG,
});

export const aggregateRecipePortionsNutrition = (
  portions: RecipePortionNutritionInput[],
): AggregatedNutrition => {
  let contributing = 0;
  let totals = emptyTotals();
  for (const portion of portions) {
    if (!isReadyPortion(portion)) {
      continue;
    }
    contributing += 1;
    totals = addTotals(totals, scalePortion(portion));
  }
  return toAggregatedNutrition(
    totals,
    resolveStatus(portions.length, contributing),
  );
};

export type PlanNutritionEntryInput =
  | {
      kind: 'portions';
      portions: RecipePortionNutritionInput[];
      quantity: number;
    }
  | {kind: 'aggregated'; nutrition: AggregatedNutrition; quantity: number};

export const aggregatePlanNutrition = (
  entries: PlanNutritionEntryInput[],
  dayCount: number | null,
): MealPlanNutrition => {
  let contributing = 0;
  let totals = emptyTotals();

  for (const entry of entries) {
    if (entry.kind === 'aggregated') {
      if (entry.nutrition.status === 'unavailable') {
        continue;
      }
      contributing += 1;
      totals = addTotals(
        totals,
        multiplyTotals(totalsFromAggregated(entry.nutrition), entry.quantity),
      );
      continue;
    }

    const aggregated = aggregateRecipePortionsNutrition(entry.portions);
    if (aggregated.status === 'unavailable') {
      continue;
    }
    contributing += 1;
    totals = addTotals(
      totals,
      multiplyTotals(totalsFromAggregated(aggregated), entry.quantity),
    );
  }

  const status = resolveStatus(entries.length, contributing);
  const whole = toAggregatedNutrition(totals, status);
  const perDay =
    typeof dayCount === 'number' && dayCount >= 1 && status !== 'unavailable'
      ? toAggregatedNutrition(divideTotals(totals, dayCount), status)
      : null;

  return {...whole, perDay};
};

export const planDayCount = (
  startsOn: string | null,
  endsOn: string | null,
): number | null => {
  if (!startsOn || !endsOn) {
    return null;
  }
  const start = Date.parse(`${startsOn}T00:00:00.000Z`);
  const end = Date.parse(`${endsOn}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }
  return Math.floor((end - start) / 86_400_000) + 1;
};
