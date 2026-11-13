import type {NutritionGoals} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

const GOALS_SELECT_SQL = `
  select goal_calories_min, goal_calories_max, goal_protein_g_min, goal_protein_g_max, goal_carbs_g_min, goal_carbs_g_max, goal_fat_g_min, goal_fat_g_max, goal_satiety_score_min, goal_satiety_score_max
  from users
  where id = $1
`;

const GOALS_UPDATE_SQL = `
  update users
  set goal_calories_min = $2,
      goal_calories_max = $3,
      goal_protein_g_min = $4,
      goal_protein_g_max = $5,
      goal_carbs_g_min = $6,
      goal_carbs_g_max = $7,
      goal_fat_g_min = $8,
      goal_fat_g_max = $9,
      goal_satiety_score_min = $10,
      goal_satiety_score_max = $11
  where id = $1
  returning goal_calories_min, goal_calories_max, goal_protein_g_min, goal_protein_g_max, goal_carbs_g_min, goal_carbs_g_max, goal_fat_g_min, goal_fat_g_max, goal_satiety_score_min, goal_satiety_score_max
`;

type GoalsRow = {
  goal_calories_min: number | null;
  goal_calories_max: number | null;
  goal_protein_g_min: number | null;
  goal_protein_g_max: number | null;
  goal_carbs_g_min: number | null;
  goal_carbs_g_max: number | null;
  goal_fat_g_min: number | null;
  goal_fat_g_max: number | null;
  goal_satiety_score_min: number | null;
  goal_satiety_score_max: number | null;
};

export const mapRowToNutritionGoals = (row: GoalsRow): NutritionGoals => ({
  caloriesMin: row.goal_calories_min,
  caloriesMax: row.goal_calories_max,
  proteinGMin: row.goal_protein_g_min,
  proteinGMax: row.goal_protein_g_max,
  carbsGMin: row.goal_carbs_g_min,
  carbsGMax: row.goal_carbs_g_max,
  fatGMin: row.goal_fat_g_min,
  fatGMax: row.goal_fat_g_max,
  satietyScoreMin: row.goal_satiety_score_min,
  satietyScoreMax: row.goal_satiety_score_max,
});

export const emptyNutritionGoals = (): NutritionGoals => ({
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
});

export const fetchNutritionGoals = async (
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<NutritionGoals> => {
  const result = await queryFn(GOALS_SELECT_SQL, [userId]);
  const row = result.rows[0] as GoalsRow | undefined;
  if (!row) {
    return emptyNutritionGoals();
  }
  return mapRowToNutritionGoals(row);
};

export const updateNutritionGoals = async (
  userId: string,
  goals: NutritionGoals,
  queryFn: QueryFn = defaultQuery,
): Promise<NutritionGoals | null> => {
  const result = await queryFn(GOALS_UPDATE_SQL, [
    userId,
    goals.caloriesMin,
    goals.caloriesMax,
    goals.proteinGMin,
    goals.proteinGMax,
    goals.carbsGMin,
    goals.carbsGMax,
    goals.fatGMin,
    goals.fatGMax,
    goals.satietyScoreMin,
    goals.satietyScoreMax,
  ]);
  const row = result.rows[0] as GoalsRow | undefined;
  if (!row) {
    return null;
  }
  return mapRowToNutritionGoals(row);
};
