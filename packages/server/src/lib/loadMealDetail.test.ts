import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {
  MEAL_ID,
  RECIPE_ID,
  USER_ID,
  accessibleRecipeRow,
  mealRecipeRow,
  mealRow,
} from '../test/fixtures/mealQueryRows.js';
import {emptyShareGrant} from '../test/mealQueryMock.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  loadMealDetail,
  listMealsForUser,
  nutritionFromMembers,
} from './loadMealDetail.js';

describe('loadMealDetail', () => {
  test('returns null when meal is missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    await expect(
      loadMealDetail(MEAL_ID, USER_ID, mockQuery),
    ).resolves.toBeNull();
  });

  test('loads meal with accessible recipe member', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.title).toBe('Sunday Dinner');
    expect(meal?.members).toHaveLength(1);
    expect(meal?.members[0]?.title).toBe('Soup');
    expect(meal?.members[0]?.accessLost).toBe(false);
  });

  test('returns string timestamps when pg returns Date objects for the meal row', async () => {
    // Same timestamptz mismatch as the meal-plan row (#358/#360):
    // created_at / updated_at arrive as Date objects from node-postgres
    // but are declared (and consumed) as strings.
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            ...mealRow,
            created_at: new Date('2026-01-01T12:00:00.000Z'),
            updated_at: new Date('2026-01-02T12:00:00.000Z'),
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]));

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.createdAt).toBe('2026-01-01T12:00:00.000Z');
    expect(meal?.updatedAt).toBe('2026-01-02T12:00:00.000Z');
  });

  test('marks inaccessible recipes as accessLost', async () => {
    const mockQuery = createMockQuery();
    const privateRecipe = {...accessibleRecipeRow, user_id: 'other-user'};
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([privateRecipe]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([privateRecipe]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.members[0]?.accessLost).toBe(true);
    expect(meal?.members[0]?.title).toBe('Soup');
  });

  test('uses unavailable title when recipe row is missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([]));

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.members[0]?.title).toBe('Unavailable recipe');
    expect(meal?.members[0]?.accessLost).toBe(true);
  });

  test('nulls member macros when access is lost', async () => {
    const mockQuery = createMockQuery();
    const privateRecipe = {...accessibleRecipeRow, user_id: 'other-user'};
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([privateRecipe]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.members[0]?.calories).toBeNull();
    expect(meal?.members[0]?.proteinG).toBeNull();
    expect(meal?.members[0]?.satietyScore).toBeNull();
  });

  test('leaves macro fields null when recipe nutrition is missing', async () => {
    const mockQuery = createMockQuery();
    const recipe = {
      ...accessibleRecipeRow,
      satiety_score: null,
      calories: null,
      protein_g: null,
    };
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([recipe]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.members[0]?.satietyScore).toBeNull();
    expect(meal?.members[0]?.calories).toBeNull();
    expect(meal?.members[0]?.proteinG).toBeNull();
  });

  test('leaves nutrition fields null when status is missing', async () => {
    const mockQuery = createMockQuery();
    const recipe = {...accessibleRecipeRow, nutrition_status: null};
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([recipe]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.members[0]?.nutritionStatus).toBeNull();
  });
});

describe('listMealsForUser', () => {
  test('returns meal summaries', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meals = await listMealsForUser(USER_ID, mockQuery);
    expect(meals).toHaveLength(1);
    expect(meals[0]?.title).toBe('Sunday Dinner');
  });
});

describe('nutritionFromMembers', () => {
  test('aggregates member nutrition', () => {
    const recipesById = new Map([[RECIPE_ID, accessibleRecipeRow]]);
    const nutrition = nutritionFromMembers(
      [
        {
          recipeId: RECIPE_ID,
          sortOrder: 0,
          servings: 4,
          title: 'Soup',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          satietyScore: 50,
          nutritionStatus: 'ready',
          calories: 100,
          proteinG: 10,
        },
      ],
      recipesById,
    );
    expect(nutrition.calories).toBeGreaterThan(0);
  });
});
