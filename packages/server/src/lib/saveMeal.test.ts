import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {accessibleRecipeRow} from '../test/fixtures/mealQueryRows.js';
import {
  emptyShareGrant,
  installLoadMealDetailMock,
  MEAL_ID,
  mealInput,
  RECIPE_ID,
  USER_ID,
} from '../test/mealQueryMock.js';
import {createMockQuery} from '../test/mockQuery.js';

import {deleteMeal, replaceMeal, saveNewMeal} from './saveMeal.js';

describe('saveNewMeal', () => {
  test('creates meal when recipes are accessible', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]));
    installLoadMealDetailMock(mockQuery);

    const result = await saveNewMeal(USER_ID, mealInput, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.id).toBe(MEAL_ID);
  });

  test('returns 500 when saved meal cannot be loaded', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const result = await saveNewMeal(USER_ID, mealInput, mockQuery);
    expect(result).toEqual({error: 'Failed to load meal', status: 500});
  });

  test('defaults servings from recipe when omitted', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]));
    installLoadMealDetailMock(mockQuery);

    const result = await saveNewMeal(
      USER_ID,
      {title: 'Dinner', recipes: [{recipeId: RECIPE_ID}]},
      mockQuery,
    );
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.id).toBe(MEAL_ID);
  });

  test('rejects inaccessible recipe', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(emptyShareGrant);

    const result = await saveNewMeal(
      USER_ID,
      {title: 'Dinner', recipes: [{recipeId: RECIPE_ID}]},
      mockQuery,
    );
    expect(result).toEqual({
      error: `Recipe not found or not accessible: ${RECIPE_ID}`,
      status: 400,
    });
  });
});

describe('replaceMeal', () => {
  test('returns 404 when meal missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const result = await replaceMeal(MEAL_ID, USER_ID, mealInput, mockQuery);
    expect(result).toEqual({error: 'Meal not found', status: 404});
  });

  test('updates meal recipes', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));
    installLoadMealDetailMock(mockQuery);

    const result = await replaceMeal(MEAL_ID, USER_ID, mealInput, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.id).toBe(MEAL_ID);
  });

  test('returns 500 when replace cannot reload meal', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const result = await replaceMeal(MEAL_ID, USER_ID, mealInput, mockQuery);
    expect(result).toEqual({error: 'Failed to load meal', status: 500});
  });

  test('defaults servings on replace when omitted', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));
    installLoadMealDetailMock(mockQuery);

    const result = await replaceMeal(
      MEAL_ID,
      USER_ID,
      {title: 'Dinner', recipes: [{recipeId: RECIPE_ID}]},
      mockQuery,
    );
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.id).toBe(MEAL_ID);
  });

  test('rejects inaccessible recipe on replace', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(emptyShareGrant);
    const result = await replaceMeal(MEAL_ID, USER_ID, mealInput, mockQuery);
    expect(result).toEqual({
      error: `Recipe not found or not accessible: ${RECIPE_ID}`,
      status: 400,
    });
  });

  test('returns 409 and writes no members when the conditional update matches no row (#384)', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('select id, updated_at from meals')) {
        return makeQueryResult([
          {id: MEAL_ID, updated_at: '2024-01-01T00:00:00.000Z'},
        ]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([accessibleRecipeRow]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('update meals')) {
        // A concurrent write landed after the early token check: the
        // version predicate no longer matches.
        return {...makeQueryResult([]), rowCount: 0};
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await replaceMeal(
      MEAL_ID,
      USER_ID,
      {...mealInput, expectedUpdatedAt: '2024-01-01T00:00:00.000Z'},
      mockQuery,
    );
    expect(result).toEqual({
      error: 'Meal has been modified since it was loaded',
      status: 409,
    });
    const memberWrites = mockQuery.mock.calls.filter(([sql]) =>
      /delete from meal_recipes|insert into meal_recipes/.test(String(sql)),
    );
    expect(memberWrites).toEqual([]);
  });

  test('matches a current token against a sub-millisecond stored timestamp (#384)', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('select id, updated_at from meals')) {
        return makeQueryResult([
          {id: MEAL_ID, updated_at: '2024-01-01T00:00:00.123456Z'},
        ]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([accessibleRecipeRow]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('update meals')) {
        return {...makeQueryResult([]), rowCount: 1};
      }
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([
          {
            id: MEAL_ID,
            user_id: USER_ID,
            title: 'Sunday Dinner',
            notes: null,
            created_at: '2024-01-01T00:00:00.000Z',
            // node-postgres hands timestamptz back as a Date, which the
            // detail loader normalizes to the millisecond token.
            updated_at: new Date('2024-01-01T00:00:00.123456Z'),
          },
        ]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([
          {meal_id: MEAL_ID, recipe_id: RECIPE_ID, sort_order: 0, servings: 4},
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    // The API token carries millisecond precision (.123Z) while the
    // stored timestamptz carries microseconds (.123456Z); they name the
    // same version and the write must succeed.
    const result = await replaceMeal(
      MEAL_ID,
      USER_ID,
      {...mealInput, expectedUpdatedAt: '2024-01-01T00:00:00.123Z'},
      mockQuery,
    );
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.id).toBe(MEAL_ID);
    expect(result.meal.updatedAt).toBe('2024-01-01T00:00:00.123Z');
    // The UPDATE itself must compare at millisecond precision — with raw
    // equality the sub-millisecond stored value would match no row.
    const updateCall = mockQuery.mock.calls.find(([sql]) =>
      String(sql).includes('update meals'),
    );
    expect(String(updateCall?.[0])).toContain(
      "date_trunc('milliseconds', updated_at)",
    );
    expect(updateCall?.[1]).toContainEqual(['2024-01-01T00:00:00.123Z']);
    // The version must strictly advance on every replace: a plain now()
    // landing in the same millisecond as the previous write would
    // reissue the same token, and a stale token could then match again.
    expect(String(updateCall?.[0])).toContain(
      "greatest(now(), date_trunc('milliseconds', updated_at) + interval '1 millisecond')",
    );
  });

  test('propagates unexpected errors from the replace writes', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('select id, updated_at from meals')) {
        return makeQueryResult([
          {id: MEAL_ID, updated_at: '2024-01-01T00:00:00.000Z'},
        ]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([accessibleRecipeRow]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('update meals')) {
        throw new Error('db down');
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    await expect(
      replaceMeal(MEAL_ID, USER_ID, mealInput, mockQuery),
    ).rejects.toThrow('db down');
  });
});

describe('deleteMeal', () => {
  test('blocks delete when referenced by plan', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([{exists: 1}]));
    const result = await deleteMeal(MEAL_ID, USER_ID, mockQuery);
    expect(result).toEqual({
      error: 'Meal is referenced by a meal plan',
      status: 409,
    });
  });

  test('deletes meal when not referenced', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 1});
    const result = await deleteMeal(MEAL_ID, USER_ID, mockQuery);
    expect(result).toEqual({ok: true});
  });

  test('returns 404 when meal missing on delete', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});
    const result = await deleteMeal(MEAL_ID, USER_ID, mockQuery);
    expect(result).toEqual({error: 'Meal not found', status: 404});
  });
});
