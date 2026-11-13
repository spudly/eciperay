import type {MealPlanNutrition, NutritionGoals} from '@eciperay/types';

import {comparePlanToGoals, hasAnyNutritionGoal} from './comparePlanToGoals.js';

const nutrition: MealPlanNutrition = {
  calories: 2000,
  proteinG: 150,
  carbsG: 200,
  fatG: 60,
  fiberG: 20,
  sugarG: 30,
  sodiumMg: 2000,
  preparedWeightG: 1500,
  satietyScore: 70,
  status: 'ready',
  perDay: null,
};

const noGoals: NutritionGoals = {
  caloriesMin: null,
  caloriesMax: null,
  proteinGMin: null,
  proteinGMax: null,
  carbsGMin: null,
  carbsGMax: null,
  fatGMin: null,
  fatGMax: null,
  satietyScoreMin: null,
  satietyScoreMax: null,
};

const goalsWith = (partial: Partial<NutritionGoals>): NutritionGoals => ({
  ...noGoals,
  ...partial,
});

describe('comparePlanToGoals', () => {
  test('returns null when no goals set', () => {
    expect(hasAnyNutritionGoal(noGoals)).toBe(false);
    expect(comparePlanToGoals(nutrition, noGoals)).toBeNull();
  });

  test('hasAnyNutritionGoal is true when any single bound is set', () => {
    expect(hasAnyNutritionGoal(goalsWith({fatGMax: 80}))).toBe(true);
    expect(hasAnyNutritionGoal(goalsWith({satietyScoreMin: 50}))).toBe(true);
  });

  test('bands every field against its range', () => {
    const goals = goalsWith({
      caloriesMin: 1800,
      caloriesMax: 2200,
      proteinGMin: 100,
      proteinGMax: 140,
      carbsGMin: 225,
      carbsGMax: 275,
      satietyScoreMin: 60,
      satietyScoreMax: null,
    });
    const progress = comparePlanToGoals(nutrition, goals);
    expect(progress?.calories?.band).toBe('onTrack');
    expect(progress?.proteinG?.band).toBe('over');
    expect(progress?.carbsG?.band).toBe('under');
    expect(progress?.fatG).toBeNull();
    expect(progress?.satietyScore?.band).toBe('onTrack');
  });

  test('progress carries min/max and delta semantics', () => {
    const goals = goalsWith({
      caloriesMin: 1800,
      caloriesMax: 2200,
      proteinGMin: 100,
      proteinGMax: 140,
      carbsGMin: 225,
      carbsGMax: 275,
    });
    const progress = comparePlanToGoals(nutrition, goals);
    // On track: delta 0.
    expect(progress?.calories).toEqual({
      min: 1800,
      max: 2200,
      actual: 2000,
      delta: 0,
      band: 'onTrack',
    });
    // Over: delta is actual - max.
    expect(progress?.proteinG?.delta).toBe(10);
    // Under: delta is actual - min.
    expect(progress?.carbsG?.delta).toBe(-25);
  });

  test('min-only and max-only goals band on the set side only', () => {
    const minOnly = comparePlanToGoals(
      nutrition,
      goalsWith({proteinGMin: 200}),
    );
    expect(minOnly?.proteinG).toEqual({
      min: 200,
      max: null,
      actual: 150,
      delta: -50,
      band: 'under',
    });
    // Far above a min-only goal is still on track.
    const minOnlyHigh = comparePlanToGoals(
      {...nutrition, proteinG: 400},
      goalsWith({proteinGMin: 200}),
    );
    expect(minOnlyHigh?.proteinG?.band).toBe('onTrack');

    const maxOnly = comparePlanToGoals(nutrition, goalsWith({fatGMax: 50}));
    expect(maxOnly?.fatG).toEqual({
      min: null,
      max: 50,
      actual: 60,
      delta: 10,
      band: 'over',
    });
    // Far below a max-only goal is still on track.
    const maxOnlyLow = comparePlanToGoals(
      {...nutrition, fatG: 10},
      goalsWith({fatGMax: 50}),
    );
    expect(maxOnlyLow?.fatG?.band).toBe('onTrack');
  });

  test('values exactly on min or max are on track', () => {
    const goals = goalsWith({caloriesMin: 2000, caloriesMax: 2000});
    expect(comparePlanToGoals(nutrition, goals)?.calories?.band).toBe(
      'onTrack',
    );
    const atMin = comparePlanToGoals(
      nutrition,
      goalsWith({proteinGMin: 150, proteinGMax: 200}),
    );
    expect(atMin?.proteinG?.band).toBe('onTrack');
    const atMax = comparePlanToGoals(
      nutrition,
      goalsWith({proteinGMin: 100, proteinGMax: 150}),
    );
    expect(atMax?.proteinG?.band).toBe('onTrack');
  });

  test('satiety uses the same unified rule, including over', () => {
    const over = comparePlanToGoals(
      nutrition,
      goalsWith({satietyScoreMin: 40, satietyScoreMax: 60}),
    );
    expect(over?.satietyScore?.band).toBe('over');
    expect(over?.satietyScore?.delta).toBe(10);
    const under = comparePlanToGoals(
      {...nutrition, satietyScore: 50},
      goalsWith({satietyScoreMin: 80}),
    );
    expect(under?.satietyScore?.band).toBe('under');
  });

  test('uses perDay when present', () => {
    const withPerDay: MealPlanNutrition = {
      ...nutrition,
      calories: 6000,
      perDay: {...nutrition, calories: 2000},
    };
    const goals = goalsWith({caloriesMin: 1800, caloriesMax: 2200});
    expect(comparePlanToGoals(withPerDay, goals)?.calories?.actual).toBe(2000);
  });

  test('returns null for unavailable nutrition', () => {
    const goals = goalsWith({caloriesMin: 1800, caloriesMax: 2200});
    expect(
      comparePlanToGoals({...nutrition, status: 'unavailable'}, goals),
    ).toBeNull();
    expect(comparePlanToGoals(null, goals)).toBeNull();
  });
});
