export const MEAL_ID = '00000000-0000-4000-8000-000000000010';
export const RECIPE_ID = '00000000-0000-4000-8000-000000000011';
export const VERSION_ID = '00000000-0000-4000-8000-000000000012';
export const PLAN_ID = '00000000-0000-4000-8000-000000000013';
export const USER_ID = 'user-uuid-1';

export const mealRow = {
  id: MEAL_ID,
  user_id: USER_ID,
  title: 'Sunday Dinner',
  notes: null as string | null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const mealRecipeRow = {
  meal_id: MEAL_ID,
  recipe_id: RECIPE_ID,
  sort_order: 0,
  servings: 4,
};

export const accessibleRecipeRow = {
  id: RECIPE_ID,
  user_id: USER_ID,
  visibility: 'private' as const,
  share_token_hash: null,
  version_id: VERSION_ID,
  servings: 4,
  title: 'Soup',
  image_url: null,
  calories: 100,
  protein_g: 10,
  carbs_g: 5,
  fat_g: 2,
  fiber_g: null,
  sugar_g: null,
  sodium_mg: null,
  prepared_weight_g: 400,
  satiety_score: 50,
  nutrition_status: 'ready',
  step_timing_status: 'ready',
};

export const mealPlanRow = {
  id: PLAN_ID,
  user_id: USER_ID,
  title: 'This week',
  notes: null as string | null,
  starts_on: '2026-01-01',
  ends_on: '2026-01-07',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};
