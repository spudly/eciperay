import type {NutritionGoals} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

const GOALS_SELECT_SQL = `
  select goal_calories, goal_protein_g, goal_carbs_g, goal_fat_g, goal_satiety_score
  from users
  where id = $1
`;

const GOALS_UPDATE_SQL = `
  update users
  set goal_calories = $2,
      goal_protein_g = $3,
      goal_carbs_g = $4,
      goal_fat_g = $5,
      goal_satiety_score = $6
  where id = $1
  returning goal_calories, goal_protein_g, goal_carbs_g, goal_fat_g, goal_satiety_score
`;

type GoalsRow = {
  goal_calories: number | null;
  goal_protein_g: number | null;
  goal_carbs_g: number | null;
  goal_fat_g: number | null;
  goal_satiety_score: number | null;
};

export const mapRowToNutritionGoals = (row: GoalsRow): NutritionGoals => ({
  calories: row.goal_calories,
  proteinG: row.goal_protein_g,
  carbsG: row.goal_carbs_g,
  fatG: row.goal_fat_g,
  satietyScore: row.goal_satiety_score,
});

export const emptyNutritionGoals = (): NutritionGoals => ({
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  satietyScore: null,
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
    goals.calories,
    goals.proteinG,
    goals.carbsG,
    goals.fatG,
    goals.satietyScore,
  ]);
  const row = result.rows[0] as GoalsRow | undefined;
  if (!row) {
    return null;
  }
  return mapRowToNutritionGoals(row);
};
