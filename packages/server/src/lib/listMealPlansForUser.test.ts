import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {PLAN_ID, USER_ID, mealPlanRow} from '../test/fixtures/mealQueryRows.js';
import {createMockQuery} from '../test/mockQuery.js';

import {listMealPlansForUser} from './listMealPlansForUser.js';

describe('listMealPlansForUser', () => {
  test('returns plan summaries without entries', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meal_plans where user_id')) {
        return makeQueryResult([{id: PLAN_ID}]);
      }
      if (sql.includes('from meal_plans') && sql.includes('where id =')) {
        return makeQueryResult([mealPlanRow]);
      }
      if (sql.includes('from meal_plan_entries')) {
        return makeQueryResult([]);
      }
      if (sql.includes('goal_calories')) {
        return makeQueryResult([
          {
            goal_calories: null,
            goal_protein_g: null,
            goal_carbs_g: null,
            goal_fat_g: null,
            goal_satiety_score: null,
          },
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const plans = await listMealPlansForUser(USER_ID, mockQuery);
    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe(PLAN_ID);
    expect(plans[0]).not.toHaveProperty('entries');
  });
});
