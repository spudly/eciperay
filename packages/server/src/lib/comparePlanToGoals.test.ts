import type {MealPlanNutrition, NutritionGoals} from '@eciperay/types';

import {comparePlanToGoals} from './comparePlanToGoals.js';

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

describe('comparePlanToGoals', () => {
  test('returns null when no goals set', () => {
    const goals: NutritionGoals = {
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      satietyScore: null,
    };
    expect(comparePlanToGoals(nutrition, goals)).toBeNull();
  });

  test('bands macros and satiety', () => {
    const goals: NutritionGoals = {
      calories: 2000,
      proteinG: 100,
      carbsG: 250,
      fatG: 60,
      satietyScore: 60,
    };
    const progress = comparePlanToGoals(nutrition, goals);
    expect(progress?.calories?.band).toBe('onTrack');
    expect(progress?.proteinG?.band).toBe('over');
    expect(progress?.carbsG?.band).toBe('under');
    expect(progress?.satietyScore?.band).toBe('onTrack');
  });

  test('uses perDay when present', () => {
    const withPerDay: MealPlanNutrition = {
      ...nutrition,
      calories: 6000,
      perDay: {...nutrition, calories: 2000},
    };
    const goals: NutritionGoals = {
      calories: 2000,
      proteinG: null,
      carbsG: null,
      fatG: null,
      satietyScore: null,
    };
    expect(comparePlanToGoals(withPerDay, goals)?.calories?.actual).toBe(2000);
  });

  test('marks satiety under when below goal', () => {
    const goals: NutritionGoals = {
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      satietyScore: 80,
    };
    const progress = comparePlanToGoals(
      {...nutrition, satietyScore: 50},
      goals,
    );
    expect(progress?.satietyScore?.band).toBe('under');
  });

  test('returns null percent when goal is zero', () => {
    const goals: NutritionGoals = {
      calories: 0,
      proteinG: null,
      carbsG: null,
      fatG: null,
      satietyScore: null,
    };
    expect(
      comparePlanToGoals(nutrition, goals)?.calories?.percentOfGoal,
    ).toBeNull();
  });

  test('returns null for unavailable nutrition', () => {
    const goals: NutritionGoals = {
      calories: 2000,
      proteinG: null,
      carbsG: null,
      fatG: null,
      satietyScore: null,
    };
    expect(
      comparePlanToGoals({...nutrition, status: 'unavailable'}, goals),
    ).toBeNull();
    expect(comparePlanToGoals(null, goals)).toBeNull();
  });
});
