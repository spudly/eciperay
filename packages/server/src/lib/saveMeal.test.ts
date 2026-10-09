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
