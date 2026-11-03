import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  TOUCH_MEALS_FOR_RECIPE_SQL,
  touchMealsForRecipe,
} from './touchMealsForRecipe.js';

const mockQuery = createMockQuery();

describe('touchMealsForRecipe', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('advances updated_at for every meal containing the recipe', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));

    await touchMealsForRecipe('recipe-uuid-1', mockQuery);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'recipe-uuid-1',
    ]);
    const sql = mockQuery.mock.calls[0]?.[0] as unknown as string;
    expect(sql).toContain('update meals');
    expect(sql).toContain('set updated_at');
    expect(sql).toContain(
      'select meal_id from meal_recipes where recipe_id = $1',
    );
  });

  test('bumps monotonically at millisecond precision so the ETag always moves', () => {
    expect(TOUCH_MEALS_FOR_RECIPE_SQL).toContain('greatest(');
    expect(TOUCH_MEALS_FOR_RECIPE_SQL).toContain(
      "date_trunc('milliseconds', updated_at) + interval '1 millisecond'",
    );
  });
});
