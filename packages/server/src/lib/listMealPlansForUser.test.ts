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

  test('returns summaries for a dated plan whose row carries Date objects', async () => {
    // Regression (#360): the list loads every plan's detail, so one dated
    // plan in the account (e.g. an orphan left by a failed dated save)
    // threw in loadMealPlanDetail and 500ed the whole list, even though
    // the user's other plans are dateless. Rows here carry the real
    // driver types: Date objects for the DATE and timestamptz columns.
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meal_plans where user_id')) {
        return makeQueryResult([{id: PLAN_ID}]);
      }
      if (sql.includes('from meal_plans') && sql.includes('where id =')) {
        return makeQueryResult([
          {
            ...mealPlanRow,
            starts_on: new Date(2026, 10, 2),
            ends_on: new Date(2026, 10, 8),
            created_at: new Date('2026-11-01T18:39:22.249Z'),
            updated_at: new Date('2026-11-01T19:22:05.819Z'),
          },
        ]);
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
    expect(plans[0]?.startsOn).toBe('2026-11-02');
    expect(plans[0]?.endsOn).toBe('2026-11-08');
    expect(plans[0]?.createdAt).toBe('2026-11-01T18:39:22.249Z');
    expect(plans[0]?.updatedAt).toBe('2026-11-01T19:22:05.819Z');
  });
});
