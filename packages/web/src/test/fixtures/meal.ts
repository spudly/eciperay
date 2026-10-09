import type {
  Meal,
  MealCookPlan,
  MealDetail,
  MealPlan,
  MealPlanDetail,
} from '@eciperay/types';

export const MEAL_ID = '00000000-0000-4000-8000-000000000010';
export const PLAN_ID = '00000000-0000-4000-8000-000000000013';

export const makeMealSummary = (overrides: Partial<Meal> = {}): Meal => ({
  id: MEAL_ID,
  userId: 'user-uuid-1',
  title: 'Sunday Dinner',
  notes: null,
  memberCount: 1,
  nutrition: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

export const makeMealDetail = (
  overrides: Partial<MealDetail> = {},
): MealDetail => ({
  ...makeMealSummary(),
  members: [
    {
      recipeId: 'recipe-uuid-1',
      sortOrder: 0,
      servings: 4,
      title: 'Test Recipe',
      imageUrl: null,
      recipeServings: 4,
      accessLost: false,
      satietyScore: null,
      nutritionStatus: null,
      calories: null,
      proteinG: null,
    },
  ],
  ...overrides,
});

export const makeMealPlanSummary = (
  overrides: Partial<MealPlan> = {},
): MealPlan => ({
  id: PLAN_ID,
  userId: 'user-uuid-1',
  title: 'This week',
  notes: null,
  startsOn: '2026-01-01',
  endsOn: '2026-01-07',
  entryCount: 0,
  nutrition: null,
  goalProgress: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

export const makeMealPlanDetail = (
  overrides: Partial<MealPlanDetail> = {},
): MealPlanDetail => ({...makeMealPlanSummary(), entries: [], ...overrides});

export const makeMealCookPlan = (
  overrides: Partial<MealCookPlan> = {},
): MealCookPlan => ({
  mealId: MEAL_ID,
  totalDurationMin: 10,
  timingStatus: 'ready',
  steps: [
    {
      recipeId: 'recipe-uuid-1',
      recipeTitle: 'Test Recipe',
      instructionId: 'instr-1',
      stepNumber: 1,
      body: 'Mix dry ingredients',
      durationMin: 10,
      startOffsetMin: 0,
      endOffsetMin: 10,
    },
  ],
  ...overrides,
});
