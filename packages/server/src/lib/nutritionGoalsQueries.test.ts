import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  emptyNutritionGoals,
  fetchNutritionGoals,
  mapRowToNutritionGoals,
  updateNutritionGoals,
} from './nutritionGoalsQueries.js';

describe('nutritionGoalsQueries', () => {
  test('mapRowToNutritionGoals maps columns', () => {
    expect(
      mapRowToNutritionGoals({
        goal_calories_min: 1800,
        goal_calories_max: 2200,
        goal_protein_g_min: 150,
        goal_protein_g_max: null,
        goal_carbs_g_min: null,
        goal_carbs_g_max: null,
        goal_fat_g_min: null,
        goal_fat_g_max: null,
        goal_satiety_score_min: 60,
        goal_satiety_score_max: null,
      }),
    ).toEqual({
      caloriesMin: 1800,
      caloriesMax: 2200,
      proteinGMin: 150,
      proteinGMax: null,
      carbsGMin: null,
      carbsGMax: null,
      fatGMin: null,
      fatGMax: null,
      satietyScoreMin: 60,
      satietyScoreMax: null,
    });
  });

  test('fetchNutritionGoals returns empty when user row missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    await expect(fetchNutritionGoals('user-1', mockQuery)).resolves.toEqual(
      emptyNutritionGoals(),
    );
  });

  test('updateNutritionGoals persists goals', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {
          goal_calories_min: 1620,
          goal_calories_max: 1980,
          goal_protein_g_min: 120,
          goal_protein_g_max: null,
          goal_carbs_g_min: null,
          goal_carbs_g_max: 200,
          goal_fat_g_min: null,
          goal_fat_g_max: 60,
          goal_satiety_score_min: null,
          goal_satiety_score_max: null,
        },
      ]),
    );
    const updated = await updateNutritionGoals(
      'user-1',
      {
        caloriesMin: 1620,
        caloriesMax: 1980,
        proteinGMin: 120,
        proteinGMax: null,
        carbsGMin: null,
        carbsGMax: 200,
        fatGMin: null,
        fatGMax: 60,
        satietyScoreMin: null,
        satietyScoreMax: null,
      },
      mockQuery,
    );
    expect(updated).toEqual({
      caloriesMin: 1620,
      caloriesMax: 1980,
      proteinGMin: 120,
      proteinGMax: null,
      carbsGMin: null,
      carbsGMax: 200,
      fatGMin: null,
      fatGMax: 60,
      satietyScoreMin: null,
      satietyScoreMax: null,
    });
    // The update writes the ten range columns in field order.
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('update users'),
      ['user-1', 1620, 1980, 120, null, null, 200, null, 60, null, null],
    );
  });

  test('updateNutritionGoals returns null when user missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    await expect(
      updateNutritionGoals(
        'user-1',
        {
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
        },
        mockQuery,
      ),
    ).resolves.toBeNull();
  });
});
