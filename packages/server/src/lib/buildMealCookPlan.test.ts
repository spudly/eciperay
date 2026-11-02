import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {nockAnthropicMessage} from '../test/mockNockAnthropic.js';
import {
  MEAL_ID,
  RECIPE_ID,
  USER_ID,
  accessibleRecipeRow,
  mealRecipeRow,
  mealRow,
} from '../test/fixtures/mealQueryRows.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  buildMealCookPlan,
  resolveMealCookTimingStatus,
} from './buildMealCookPlan.js';

const emptyShareGrant = {...makeQueryResult([]), rowCount: 0};

describe('resolveMealCookTimingStatus', () => {
  test('returns ready, partial, and failed bands', () => {
    expect(resolveMealCookTimingStatus(0, 2, 2)).toBe('ready');
    expect(resolveMealCookTimingStatus(1, 1, 2)).toBe('partial');
    expect(resolveMealCookTimingStatus(2, 0, 2)).toBe('failed');
  });
});

describe('buildMealCookPlan', () => {
  test('returns 404 when meal is missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const result = await buildMealCookPlan(MEAL_ID, USER_ID, mockQuery);
    expect(result).toEqual({error: 'Meal not found', status: 404});
  });

  test('builds cook plan from ready recipes', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([mealRow]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([mealRecipeRow]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([accessibleRecipeRow]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (
        sql.includes('from instructions') &&
        sql.includes('estimated_duration_min')
      ) {
        return makeQueryResult([
          {
            id: 'instr-1',
            step_number: 1,
            body: 'Simmer',
            estimated_duration_min: 10,
          },
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await buildMealCookPlan(MEAL_ID, USER_ID, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.plan.mealId).toBe(MEAL_ID);
    expect(result.plan.steps).toHaveLength(1);
    expect(result.plan.steps[0]?.recipeId).toBe(RECIPE_ID);
    expect(result.plan.timingStatus).toBe('ready');
  });

  test('defaults missing instruction durations to five minutes', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([mealRow]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([mealRecipeRow]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([accessibleRecipeRow]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('estimated_duration_min')) {
        return makeQueryResult([
          {
            id: 'instr-1',
            step_number: 1,
            body: 'Simmer',
            estimated_duration_min: null,
          },
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await buildMealCookPlan(MEAL_ID, USER_ID, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.plan.steps[0]?.durationMin).toBe(5);
  });

  test('returns 409 when member lost access', async () => {
    const mockQuery = createMockQuery();
    const privateRecipe = {...accessibleRecipeRow, user_id: 'other-user'};
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([privateRecipe]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0})
      .mockResolvedValueOnce(makeQueryResult([privateRecipe]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});

    const result = await buildMealCookPlan(MEAL_ID, USER_ID, mockQuery);
    expect(result).toEqual({
      error: 'One or more recipes in this meal are no longer accessible',
      status: 409,
    });
  });

  test('returns 409 when recipe disappears while building', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0})
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});

    const result = await buildMealCookPlan(MEAL_ID, USER_ID, mockQuery);
    expect(result).toEqual({
      error: 'One or more recipes in this meal are no longer accessible',
      status: 409,
    });
  });

  test('returns 409 when recipe disappears after the timing check', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0})
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0})
      .mockResolvedValueOnce(makeQueryResult([]));

    const result = await buildMealCookPlan(MEAL_ID, USER_ID, mockQuery);
    expect(result).toEqual({
      error: 'One or more recipes in this meal are no longer accessible',
      status: 409,
    });
  });

  test('returns 502 when no steps can be built', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([mealRow]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([mealRecipeRow]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([
          {...accessibleRecipeRow, step_timing_status: 'failed'},
        ]);
      }
      if (sql.includes('share_grants')) {
        return {...makeQueryResult([]), rowCount: 0};
      }
      if (sql.includes('estimated_duration_min')) {
        return makeQueryResult([]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await buildMealCookPlan(MEAL_ID, USER_ID, mockQuery);
    expect(result).toEqual({
      error: 'Unable to build cook plan for this meal',
      status: 502,
    });
  });

  test('still includes steps when step timing refresh throws', async () => {
    nockAnthropicMessage('not-json');
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([mealRow]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([mealRecipeRow]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([
          {...accessibleRecipeRow, step_timing_status: null},
        ]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('from recipe_versions rv')) {
        return makeQueryResult([
          {
            version_id: accessibleRecipeRow.version_id,
            title: 'Soup',
            prep_time_min: null,
            cook_time_min: null,
            step_timing_status: null,
          },
        ]);
      }
      if (sql.includes('from instructions') && sql.includes('step_number')) {
        return makeQueryResult([{id: 'i1', step_number: 1, body: 'Chop'}]);
      }
      if (sql.includes('update recipe_versions')) {
        return makeQueryResult([]);
      }
      if (sql.includes('update instructions')) {
        return makeQueryResult([]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await buildMealCookPlan(MEAL_ID, USER_ID, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    // Timing generation failing must not drop the recipe from the plan
    // (#346): its steps are still cooked, with the default duration.
    expect(result.plan.steps).toHaveLength(1);
    expect(result.plan.steps[0]?.body).toBe('Chop');
    expect(result.plan.steps[0]?.durationMin).toBe(5);
    expect(result.plan.timingStatus).toBe('failed');
  });

  test('includes both recipes steps when the second recipe timing is not ready', async () => {
    const recipeB = '00000000-0000-4000-8000-000000000099';
    const versionB = '00000000-0000-4000-8000-000000000098';
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string, params?: unknown[]) => {
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([mealRow]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([
          mealRecipeRow,
          {...mealRecipeRow, recipe_id: recipeB, sort_order: 1},
        ]);
      }
      if (sql.includes('from recipes r')) {
        const recipeId = params?.[0] as string;
        return makeQueryResult([
          recipeId === recipeB
            ? {
                ...accessibleRecipeRow,
                id: recipeB,
                version_id: versionB,
                title: 'Second Soup',
                step_timing_status: 'failed',
              }
            : accessibleRecipeRow,
        ]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('estimated_duration_min')) {
        const versionId = params?.[0] as string;
        if (versionId === versionB) {
          return makeQueryResult([
            {
              id: 'instr-b1',
              step_number: 1,
              body: 'Bring vegetable stock to a boil.',
              estimated_duration_min: 10,
            },
            {
              id: 'instr-b2',
              step_number: 2,
              body: 'Add mushrooms and salt, simmer 15 minutes.',
              estimated_duration_min: 15,
            },
          ]);
        }
        return makeQueryResult([
          {
            id: 'instr-a1',
            step_number: 1,
            body: 'Heat olive oil in a pot.',
            estimated_duration_min: 10,
          },
          {
            id: 'instr-a2',
            step_number: 2,
            body: 'Add tomatoes and simmer.',
            estimated_duration_min: 10,
          },
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await buildMealCookPlan(MEAL_ID, USER_ID, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    // Regression for #346: the second recipe's steps were dropped entirely
    // because its step timing was not ready, leaving only the first
    // recipe's 2 steps ("Step 1 of 2").
    expect(result.plan.steps).toHaveLength(4);
    expect(
      result.plan.steps.filter(step => step.recipeId === RECIPE_ID),
    ).toHaveLength(2);
    expect(
      result.plan.steps.filter(step => step.recipeId === recipeB),
    ).toHaveLength(2);
    expect(result.plan.steps.map(step => step.body)).toEqual(
      expect.arrayContaining([
        'Bring vegetable stock to a boil.',
        'Add mushrooms and salt, simmer 15 minutes.',
      ]),
    );
    expect(result.plan.timingStatus).toBe('partial');
  });

  test('reports partial timing when one recipe stays not ready', async () => {
    const recipeB = '00000000-0000-4000-8000-000000000099';
    const mockQuery = createMockQuery();
    const recipeBLoads = new Map<string, number>();
    mockQuery.mockImplementation((async (sql: string, params?: unknown[]) => {
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([mealRow]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([
          mealRecipeRow,
          {...mealRecipeRow, recipe_id: recipeB, sort_order: 1},
        ]);
      }
      if (sql.includes('from recipes r')) {
        const recipeId = params?.[0] as string;
        const loads = (recipeBLoads.get(recipeId) ?? 0) + 1;
        recipeBLoads.set(recipeId, loads);
        if (recipeId === recipeB && loads > 1) {
          return makeQueryResult([
            {...accessibleRecipeRow, id: recipeB, step_timing_status: 'failed'},
          ]);
        }
        return makeQueryResult([
          recipeId === recipeB
            ? {...accessibleRecipeRow, id: recipeB}
            : accessibleRecipeRow,
        ]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('estimated_duration_min')) {
        return makeQueryResult([
          {
            id: 'instr-1',
            step_number: 1,
            body: 'Simmer',
            estimated_duration_min: 10,
          },
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await buildMealCookPlan(MEAL_ID, USER_ID, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.plan.timingStatus).toBe('partial');
    // The not-ready recipe still contributes its steps to the plan (#346).
    expect(result.plan.steps).toHaveLength(2);
  });
});
