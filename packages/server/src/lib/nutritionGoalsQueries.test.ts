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
        goal_calories: 2000,
        goal_protein_g: 150,
        goal_carbs_g: null,
        goal_fat_g: null,
        goal_satiety_score: 60,
      }),
    ).toEqual({
      calories: 2000,
      proteinG: 150,
      carbsG: null,
      fatG: null,
      satietyScore: 60,
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
          goal_calories: 1800,
          goal_protein_g: 120,
          goal_carbs_g: 200,
          goal_fat_g: 60,
          goal_satiety_score: null,
        },
      ]),
    );
    const updated = await updateNutritionGoals(
      'user-1',
      {
        calories: 1800,
        proteinG: 120,
        carbsG: 200,
        fatG: 60,
        satietyScore: null,
      },
      mockQuery,
    );
    expect(updated).toEqual({
      calories: 1800,
      proteinG: 120,
      carbsG: 200,
      fatG: 60,
      satietyScore: null,
    });
  });

  test('updateNutritionGoals returns null when user missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    await expect(
      updateNutritionGoals(
        'user-1',
        {
          calories: null,
          proteinG: null,
          carbsG: null,
          fatG: null,
          satietyScore: null,
        },
        mockQuery,
      ),
    ).resolves.toBeNull();
  });
});
