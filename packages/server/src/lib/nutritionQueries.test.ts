import {createMockQuery} from '../test/mockQuery.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';

import {
  GET_VERSION_INGREDIENTS_SQL,
  GET_VERSION_NUTRITION_SQL,
  SET_NUTRITION_FAILED_SQL,
  SET_NUTRITION_PENDING_SQL,
  UPDATE_VERSION_NUTRITION_SQL,
  fetchVersionIngredients,
  fetchVersionNutrition,
  mapRowToNutritionInfo,
  markNutritionFailed,
  markNutritionPending,
  type VersionNutritionRow,
} from './nutritionQueries.js';

const readyRow = (): VersionNutritionRow => ({
  version_id: 'v1',
  recipe_id: 'r1',
  servings: 2,
  title: 'Soup',
  calories: 300,
  protein_g: 15,
  carbs_g: 30,
  fat_g: 8,
  fiber_g: null,
  sugar_g: null,
  sodium_mg: null,
  prepared_weight_g: 500,
  satiety_score: 55,
  nutrition_status: 'ready',
  nutrition_disclaimer: null,
  nutrition_updated_at: '2024-01-01T00:00:00.000Z',
});

describe('mapRowToNutritionInfo', () => {
  test('maps ready rows and rejects incomplete ones', () => {
    expect(mapRowToNutritionInfo(readyRow())).toEqual({
      servings: 2,
      calories: 300,
      proteinG: 15,
      carbsG: 30,
      fatG: 8,
      fiberG: null,
      sugarG: null,
      sodiumMg: null,
      preparedWeightG: 500,
      disclaimer: '',
      satietyScore: 55,
      status: 'ready',
    });
    expect(
      mapRowToNutritionInfo({...readyRow(), nutrition_status: 'failed'}),
    ).toBeNull();
    expect(mapRowToNutritionInfo({...readyRow(), calories: null})).toBeNull();
  });
});

describe('nutrition query helpers', () => {
  test('fetch helpers return rows and marks update status', async () => {
    const nutrition = readyRow();
    const queryFn = createMockQuery();
    queryFn
      .mockResolvedValueOnce(makeQueryResult([nutrition]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([{name: 'salt', quantity: 1, unit: 'tsp'}]),
      )
      .mockResolvedValue(makeQueryResult([]));

    await expect(fetchVersionNutrition('v1', queryFn)).resolves.toEqual(
      nutrition,
    );
    await expect(fetchVersionNutrition('missing', queryFn)).resolves.toBeNull();
    await expect(fetchVersionIngredients('v1', queryFn)).resolves.toEqual([
      {name: 'salt', quantity: 1, unit: 'tsp'},
    ]);
    await markNutritionPending('v1', queryFn);
    await markNutritionFailed('v1', queryFn);

    expect(queryFn).toHaveBeenCalledWith(GET_VERSION_NUTRITION_SQL, ['v1']);
    expect(queryFn).toHaveBeenCalledWith(GET_VERSION_INGREDIENTS_SQL, ['v1']);
    expect(queryFn).toHaveBeenCalledWith(SET_NUTRITION_PENDING_SQL, ['v1']);
    expect(queryFn).toHaveBeenCalledWith(SET_NUTRITION_FAILED_SQL, ['v1']);
    expect(UPDATE_VERSION_NUTRITION_SQL).toContain(
      "nutrition_status = 'ready'",
    );
  });
});
