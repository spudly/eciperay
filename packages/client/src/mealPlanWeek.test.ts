import type {
  AggregatedNutrition,
  MealPlanDetail,
  MealPlanEntry,
} from '@eciperay/types';

import {
  buildMealPlanDayTotals,
  buildMealPlanWeekView,
  groupMealPlanEntriesByDay,
  mealPlanDayLabel,
} from './mealPlanWeek.js';

const nutrition = (
  overrides: Partial<AggregatedNutrition> = {},
): AggregatedNutrition => ({
  calories: 500,
  proteinG: 30,
  carbsG: 50,
  fatG: 20,
  fiberG: 5,
  sugarG: 10,
  sodiumMg: 400,
  preparedWeightG: 300,
  satietyScore: 60,
  status: 'ready',
  ...overrides,
});

const recipeEntry = (
  id: string,
  sortOrder: number,
  overrides: Partial<Extract<MealPlanEntry, {type: 'recipe'}>> = {},
): MealPlanEntry => ({
  type: 'recipe',
  id,
  recipeId: `r-${id}`,
  sortOrder,
  quantity: 1,
  day: null,
  servingsToCook: 2,
  servingsToEat: 1,
  title: `Recipe ${id}`,
  imageUrl: null,
  recipeServings: 2,
  accessLost: false,
  nutrition: nutrition(),
  satietyScore: 60,
  nutritionStatus: 'ready',
  calories: 500,
  proteinG: 30,
  carbsG: 50,
  fatG: 20,
  ...overrides,
});

const mealEntry = (
  id: string,
  sortOrder: number,
  overrides: Partial<Extract<MealPlanEntry, {type: 'meal'}>> = {},
): MealPlanEntry => ({
  type: 'meal',
  id,
  mealId: `m-${id}`,
  sortOrder,
  quantity: 1,
  day: null,
  title: `Meal ${id}`,
  memberCount: 2,
  recipeCount: 2,
  nutrition: nutrition(),
  ...overrides,
});

const plan = (overrides: Partial<MealPlanDetail> = {}): MealPlanDetail => ({
  id: 'p1',
  userId: 'u1',
  title: 'Week 3',
  notes: null,
  startsOn: '2026-11-16',
  endsOn: '2026-11-22',
  entryCount: 0,
  nutrition: null,
  goalProgress: null,
  createdAt: '2026-11-15T00:00:00.000Z',
  updatedAt: '2026-11-15T00:00:00.000Z',
  entries: [],
  ...overrides,
});

describe('groupMealPlanEntriesByDay (#539)', () => {
  test('groups dated entries under their days, in plan order, filling the range', () => {
    const groups = groupMealPlanEntriesByDay(
      plan({
        entries: [
          recipeEntry('e2', 1, {day: '2026-11-17'}),
          recipeEntry('e1', 0, {day: '2026-11-16'}),
          mealEntry('e3', 2, {day: '2026-11-17'}),
        ],
      }),
    );
    expect(groups.map(group => group.day)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
    expect(groups[0]?.entries.map(entry => entry.id)).toEqual(['e1']);
    expect(groups[1]?.entries.map(entry => entry.id)).toEqual(['e2', 'e3']);
    expect(groups[2]?.entries).toEqual([]);
    expect(groups[2]?.totals).toBeNull();
  });

  test('undated entries fall back to startsOn in plan order (no invented split)', () => {
    const groups = groupMealPlanEntriesByDay(
      plan({
        startsOn: '2026-11-16',
        endsOn: null,
        entries: [recipeEntry('e1', 0), mealEntry('e2', 1)],
      }),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.day).toBe('2026-11-16');
    expect(groups[0]?.entries.map(entry => entry.id)).toEqual(['e1', 'e2']);
  });

  test('mixed dated and undated entries: undated join startsOn, dated keep their day', () => {
    const groups = groupMealPlanEntriesByDay(
      plan({
        endsOn: null,
        entries: [
          recipeEntry('e1', 0),
          recipeEntry('e2', 1, {day: '2026-11-18'}),
        ],
      }),
    );
    expect(groups.map(group => group.day)).toEqual([
      '2026-11-16',
      '2026-11-18',
    ]);
    expect(groups[0]?.entries.map(entry => entry.id)).toEqual(['e1']);
    expect(groups[1]?.entries.map(entry => entry.id)).toEqual(['e2']);
  });

  test('a plan with no day anchor returns no groups (host renders the flat list)', () => {
    const groups = groupMealPlanEntriesByDay(
      plan({startsOn: null, endsOn: null, entries: [recipeEntry('e1', 0)]}),
    );
    expect(groups).toEqual([]);
  });

  test('per-day totals sum entry nutrition scaled by quantity (servings eaten basis)', () => {
    const groups = groupMealPlanEntriesByDay(
      plan({
        endsOn: null,
        entries: [
          recipeEntry('e1', 0, {
            day: '2026-11-16',
            quantity: 2,
            nutrition: nutrition({calories: 500, proteinG: 30}),
          }),
          mealEntry('e2', 1, {
            day: '2026-11-16',
            nutrition: nutrition({calories: 200, proteinG: 10}),
          }),
          recipeEntry('e3', 2, {
            day: '2026-11-17',
            nutrition: nutrition({calories: 100, proteinG: 5}),
          }),
        ],
      }),
    );
    // Spot-check against the per-entry sums: 500×2 + 200 = 1200.
    expect(groups[0]?.totals?.calories).toBe(1200);
    expect(groups[0]?.totals?.proteinG).toBe(70);
    expect(groups[1]?.totals?.calories).toBe(100);
  });

  test('unavailable nutrition contributes nothing and marks the day partial', () => {
    const groups = groupMealPlanEntriesByDay(
      plan({
        endsOn: null,
        entries: [
          recipeEntry('e1', 0, {
            day: '2026-11-16',
            nutrition: nutrition({status: 'unavailable', calories: 0}),
          }),
          recipeEntry('e2', 1, {day: '2026-11-16'}),
        ],
      }),
    );
    expect(groups[0]?.totals?.calories).toBe(500);
    expect(groups[0]?.totals?.status).toBe('partial');
  });

  test('a day whose entries all lack usable nutrition has null totals', () => {
    const groups = groupMealPlanEntriesByDay(
      plan({
        endsOn: null,
        entries: [recipeEntry('e1', 0, {day: '2026-11-16', nutrition: null})],
      }),
    );
    expect(groups[0]?.totals).toBeNull();
    expect(buildMealPlanDayTotals(groups[0]!)).toEqual({dailyTotals: []});
  });

  test('day totals rows and satiety label compose from the totals', () => {
    const groups = groupMealPlanEntriesByDay(
      plan({
        endsOn: null,
        entries: [
          recipeEntry('e1', 0, {
            day: '2026-11-16',
            nutrition: nutrition({satietyScore: 80, preparedWeightG: 100}),
          }),
          recipeEntry('e2', 1, {
            day: '2026-11-16',
            nutrition: nutrition({satietyScore: 40, preparedWeightG: 300}),
          }),
        ],
      }),
    );
    const {dailyTotals, satietyLabel} = buildMealPlanDayTotals(groups[0]!);
    expect(dailyTotals).toEqual([
      {label: 'Calories', valueLabel: '1000 cal'},
      {label: 'Protein', valueLabel: '60g protein'},
      {label: 'Carbs', valueLabel: '100g carbs'},
      {label: 'Net carbs', valueLabel: '90g net carbs'},
      {label: 'Fat', valueLabel: '40g fat'},
    ]);
    // Prepared-weight-weighted: (80×100 + 40×300) / 400 = 50.
    expect(satietyLabel).toBe('Satiety 50');
  });
});

describe('buildMealPlanWeekView (#539)', () => {
  test('returns null when an undated entry has no startsOn anchor, so hosts render the complete flat list', () => {
    const view = buildMealPlanWeekView(
      plan({
        startsOn: null,
        endsOn: null,
        entries: [
          recipeEntry('e1', 0, {day: '2026-11-16'}),
          recipeEntry('e2', 1),
        ],
      }),
      entry => entry,
    );
    expect(view).toBeNull();
  });

  test('returns the week view when every entry can be grouped', () => {
    const view = buildMealPlanWeekView(
      plan({
        startsOn: null,
        endsOn: null,
        entries: [recipeEntry('e1', 0, {day: '2026-11-16'})],
      }),
      entry => entry,
    );
    expect(view?.days.map(day => day.id)).toEqual(['2026-11-16']);
  });
});

describe('mealPlanDayLabel', () => {
  test('names the weekday of a YYYY-MM-DD day', () => {
    // 2026-11-16 is a Monday.
    expect(mealPlanDayLabel('2026-11-16')).toBe('Monday');
    expect(mealPlanDayLabel('2026-11-22')).toBe('Sunday');
  });
});
