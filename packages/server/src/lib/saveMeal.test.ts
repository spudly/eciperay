import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {
  accessibleRecipeRow,
  mealIngredientRow,
  mealRow,
} from '../test/fixtures/mealQueryRows.js';
import {
  anthropicCreateSpy,
  nockAnthropicMessage,
} from '../test/mockNockAnthropic.js';
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

  // Regression for #394: replaceMeal runs after the meal_recipes delete,
  // whose trigger may already have bumped the token in the same
  // millisecond. The meal update itself must therefore use the monotonic
  // token expression, not a bare now() that could reissue the old ETag.
  test('advances updated_at monotonically on replace', async () => {
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
    const updateCall = mockQuery.mock.calls.find(([sql]) =>
      (sql as unknown as string)
        .replaceAll(/\s+/g, ' ')
        .includes('update meals set title'),
    );
    expect(updateCall).toBeDefined();
    const sql = updateCall?.[0] as unknown as string;
    expect(sql).toContain('greatest(');
    expect(sql).toContain(
      "date_trunc('milliseconds', updated_at) + interval '1 millisecond'",
    );
    expect(sql).not.toContain('updated_at = now()');
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
            // detail loader normalizes to the millisecond token. The
            // read-back value models the UPDATE's monotonic bump: the
            // stored version has advanced past the token that was sent.
            updated_at: new Date('2024-01-01T00:00:00.124456Z'),
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
    // The returned token must have advanced past the token that was
    // sent (.123Z): the read-back above carries the bumped version.
    expect(result.meal.updatedAt).toBe('2024-01-01T00:00:00.124Z');
    // The UPDATE itself must compare at millisecond precision — with raw
    // equality the sub-millisecond stored value would match no row.
    const updateCall = mockQuery.mock.calls.find(([sql]) =>
      String(sql).includes('update meals'),
    );
    expect(String(updateCall?.[0])).toContain(
      "date_trunc('milliseconds', updated_at) = ANY($5::timestamptz[])",
    );
    expect(updateCall?.[1]).toContainEqual(['2024-01-01T00:00:00.123Z']);
    // The version must strictly advance on every replace: a plain now()
    // landing in the same millisecond as the previous write would
    // reissue the same token, and a stale token could then match again.
    expect(String(updateCall?.[0])).toContain(
      "greatest(now(), date_trunc('milliseconds', updated_at) + interval '1 millisecond')",
    );
  });

  test('returns 409 and writes nothing for an empty If-Match tag (#384)', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('select id, updated_at from meals')) {
        return makeQueryResult([
          {id: MEAL_ID, updated_at: '2024-01-01T00:00:00.000Z'},
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    // `If-Match: ""` resolves to a single empty candidate: a precondition
    // that can never match, not the unconditional no-token path.
    const result = await replaceMeal(
      MEAL_ID,
      USER_ID,
      {...mealInput, expectedUpdatedAts: ['']},
      mockQuery,
    );
    expect(result).toEqual({
      error: 'Meal has been modified since it was loaded',
      status: 409,
    });
    const updates = mockQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('update meals'),
    );
    expect(updates).toEqual([]);
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

const DIRECT_NUTRITION_RESPONSE = JSON.stringify({
  calories: 200,
  proteinG: 4,
  carbsG: 44,
  fatG: 1,
  fiberG: 1,
  sugarG: 0,
  sodiumMg: 5,
  preparedWeightG: 300,
  disclaimer: 'Estimated.',
});

const directIngredientInput = {
  title: 'Snack',
  recipes: [] as {recipeId: string}[],
  ingredients: [{name: 'Rice', quantity: 2, unit: 'cups', servings: 2}],
};

const findCall = (
  mockQuery: ReturnType<typeof createMockQuery>,
  fragment: string,
) =>
  mockQuery.mock.calls.find(([sql]) => String(sql).includes(fragment)) as
    [string, unknown[]] | undefined;

describe('direct ingredients (#362)', () => {
  test('saveNewMeal creates a direct-only meal, estimating nutrition at save', async () => {
    nockAnthropicMessage(DIRECT_NUTRITION_RESPONSE);
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([mealIngredientRow]));

    const result = await saveNewMeal(USER_ID, directIngredientInput, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.ingredients).toHaveLength(1);
    expect(result.meal.ingredients[0]?.name).toBe('Rice');
    expect(result.meal.memberCount).toBe(1);
    expect(result.meal.nutrition?.calories).toBe(400);

    // The stored row carries the AI-estimated per-serving macros —
    // never user-entered values.
    const insert = findCall(mockQuery, 'insert into meal_ingredients');
    expect(insert).toBeDefined();
    expect(insert?.[1]).toEqual([
      MEAL_ID,
      'Rice',
      2,
      'cups',
      2,
      0,
      200,
      4,
      44,
      1,
      1,
      0,
      5,
      300,
      expect.any(Number) as number,
      'ready',
      'Estimated.',
    ]);
  });

  test('saveNewMeal creates a mixed meal (recipes + direct ingredients)', async () => {
    nockAnthropicMessage(DIRECT_NUTRITION_RESPONSE);
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {meal_id: MEAL_ID, recipe_id: RECIPE_ID, sort_order: 0, servings: 4},
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([mealIngredientRow]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant);

    const result = await saveNewMeal(
      USER_ID,
      {
        title: 'Dinner',
        recipes: [{recipeId: RECIPE_ID, servings: 4}],
        ingredients: [{name: 'Rice', quantity: 2, unit: 'cups', servings: 2}],
      },
      mockQuery,
    );
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.members).toHaveLength(1);
    expect(result.meal.ingredients).toHaveLength(1);
    expect(result.meal.memberCount).toBe(2);
    // Hand-computed: recipe 400 cal + direct 400 cal (fixture math).
    expect(result.meal.nutrition?.calories).toBe(800);
    expect(findCall(mockQuery, 'insert into meal_recipes')).toBeDefined();
    expect(findCall(mockQuery, 'insert into meal_ingredients')).toBeDefined();
  });

  test('saveNewMeal stores failed nutrition when estimation fails, without failing the save', async () => {
    nockAnthropicMessage('not json');
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([mealIngredientRow]));

    const result = await saveNewMeal(USER_ID, directIngredientInput, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    const insert = findCall(mockQuery, 'insert into meal_ingredients');
    expect(insert?.[1]).toContain('failed');
    expect(insert?.[1]).toContain(null);
    expect(insert?.[1]?.[6]).toBeNull();
  });

  test('replaceMeal replaces direct ingredients alongside recipes', async () => {
    nockAnthropicMessage(DIRECT_NUTRITION_RESPONSE);
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([mealIngredientRow]));

    const result = await replaceMeal(
      MEAL_ID,
      USER_ID,
      directIngredientInput,
      mockQuery,
    );
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.ingredients).toHaveLength(1);
    expect(findCall(mockQuery, 'delete from meal_ingredients')).toBeDefined();
    expect(findCall(mockQuery, 'insert into meal_ingredients')).toBeDefined();
  });

  test('saveNewMeal rejects a meal with no recipes and no ingredients (#432)', async () => {
    const mockQuery = createMockQuery();
    const result = await saveNewMeal(
      USER_ID,
      {title: 'Empty', recipes: []},
      mockQuery,
    );
    expect(result).toEqual({
      error: 'A meal must contain at least one recipe or ingredient',
      status: 400,
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('replaceMeal preserves stored direct ingredients when the input omits them (#432)', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));
    installLoadMealDetailMock(mockQuery);

    // mealInput sends recipes but no `ingredients` key — the MCP
    // read-merge-PUT shape that used to delete the stored rows.
    const result = await replaceMeal(MEAL_ID, USER_ID, mealInput, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.id).toBe(MEAL_ID);
    expect(findCall(mockQuery, 'delete from meal_ingredients')).toBeUndefined();
    expect(findCall(mockQuery, 'insert into meal_ingredients')).toBeUndefined();
    expect(anthropicCreateSpy).not.toHaveBeenCalled();
  });

  test('replaceMeal with an explicit empty ingredients list clears the stored rows (#432)', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));
    installLoadMealDetailMock(mockQuery);

    const result = await replaceMeal(
      MEAL_ID,
      USER_ID,
      {...mealInput, ingredients: []},
      mockQuery,
    );
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(findCall(mockQuery, 'delete from meal_ingredients')).toBeDefined();
    expect(findCall(mockQuery, 'insert into meal_ingredients')).toBeUndefined();
  });

  test('replaceMeal accepts an omitted-ingredients update with no recipes when stored ingredients remain (#432)', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      // In-transaction row lock, then the preserved-ingredient check.
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([{exists: 1}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([mealIngredientRow]));

    const result = await replaceMeal(
      MEAL_ID,
      USER_ID,
      {title: 'Snack', recipes: []},
      mockQuery,
    );
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.ingredients).toHaveLength(1);
    expect(findCall(mockQuery, 'delete from meal_ingredients')).toBeUndefined();
    expect(findCall(mockQuery, 'insert into meal_ingredients')).toBeUndefined();
  });

  test('replaceMeal rejects an omitted-ingredients update with no recipes when nothing is stored (#432)', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      // In-transaction row lock, then the preserved-ingredient check.
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const result = await replaceMeal(
      MEAL_ID,
      USER_ID,
      {title: 'Empty', recipes: []},
      mockQuery,
    );
    expect(result).toEqual({
      error: 'A meal must contain at least one recipe or ingredient',
      status: 400,
    });
    expect(findCall(mockQuery, 'update meals')).toBeUndefined();
  });

  // Regression for the #432 race: two tokenless replacements both start
  // from a meal whose only member is a direct ingredient. The other
  // replacement (recipes sent, ingredients explicitly cleared) commits
  // first; this preserving replacement must observe that state — its
  // in-transaction check runs after the meal row lock, which in a real
  // transaction is only acquired once the other writer commits — and
  // refuse, instead of deleting the other's recipe and preserving
  // ingredients that no longer exist (zero members, both "successful").
  // The mock seam runs the callback without a real transaction, so the
  // other writer's commit is modelled as landing at the moment this
  // writer takes the row lock.
  test('replaceMeal preserving replacement loses the race to a concurrent full replacement (#432)', async () => {
    let storedIngredientPresent = true;
    let recipeMembers = 0;
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      const text = String(sql);
      if (text.includes('select id, updated_at from meals')) {
        return makeQueryResult([
          {id: MEAL_ID, updated_at: '2024-01-01T00:00:00.000Z'},
        ]);
      }
      if (text.includes('for update')) {
        // The concurrent replacement commits while this writer waits
        // for the lock: the ingredient is gone, a recipe member remains.
        storedIngredientPresent = false;
        recipeMembers = 1;
        return makeQueryResult([{id: MEAL_ID}]);
      }
      if (text.includes('select 1 from meal_ingredients')) {
        return storedIngredientPresent
          ? makeQueryResult([{exists: 1}])
          : makeQueryResult([]);
      }
      if (text.includes('delete from meal_recipes')) {
        recipeMembers = 0;
        return makeQueryResult([]);
      }
      if (text.includes('delete from meal_ingredients')) {
        storedIngredientPresent = false;
        return makeQueryResult([]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await replaceMeal(
      MEAL_ID,
      USER_ID,
      {title: 'Renamed', recipes: []},
      mockQuery,
    );
    expect(result).toEqual({
      error: 'A meal must contain at least one recipe or ingredient',
      status: 400,
    });
    // The losing writer wrote nothing: the winner's recipe member and
    // the (already cleared) ingredient state are untouched, so the meal
    // still has exactly one member.
    expect(findCall(mockQuery, 'update meals')).toBeUndefined();
    expect(findCall(mockQuery, 'delete from meal_recipes')).toBeUndefined();
    expect(recipeMembers).toBe(1);
    expect(storedIngredientPresent).toBe(false);
    // Ordering proof: the lock is taken before the existence check.
    const sqlSequence = mockQuery.mock.calls.map(([sql]) => String(sql));
    const lockAt = sqlSequence.findIndex(text => text.includes('for update'));
    const checkAt = sqlSequence.findIndex(text =>
      text.includes('select 1 from meal_ingredients'),
    );
    expect(lockAt).toBeGreaterThan(-1);
    expect(checkAt).toBeGreaterThan(lockAt);
  });

  test('replaceMeal with a stale token writes no direct ingredients and spends no estimation (#384/#362)', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([{id: MEAL_ID, updated_at: '2024-01-01T00:00:00.000Z'}]),
    );

    const result = await replaceMeal(
      MEAL_ID,
      USER_ID,
      {...directIngredientInput, expectedUpdatedAt: '1999-01-01T00:00:00.000Z'},
      mockQuery,
    );
    expect(result).toEqual({
      error: 'Meal has been modified since it was loaded',
      status: 409,
    });
    const memberWrites = mockQuery.mock.calls.filter(([sql]) =>
      /meal_ingredients|meal_recipes/.test(String(sql)),
    );
    expect(memberWrites).toEqual([]);
    expect(anthropicCreateSpy).not.toHaveBeenCalled();
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
