import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {
  MEAL_ID,
  RECIPE_ID,
  USER_ID,
  accessibleRecipeRow,
  mealIngredientRow,
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
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.title).toBe('Sunday Dinner');
    expect(meal?.members).toHaveLength(1);
    expect(meal?.members[0]?.title).toBe('Soup');
    expect(meal?.members[0]?.accessLost).toBe(false);
    expect(meal?.members[0]?.calories).toBe(100);
    expect(meal?.members[0]?.proteinG).toBe(10);
    expect(meal?.members[0]?.carbsG).toBe(5);
    expect(meal?.members[0]?.fatG).toBe(2);
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
      .mockResolvedValueOnce(makeQueryResult([]))
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
      .mockResolvedValueOnce(makeQueryResult([]))
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
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([privateRecipe]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.members[0]?.calories).toBeNull();
    expect(meal?.members[0]?.proteinG).toBeNull();
    expect(meal?.members[0]?.carbsG).toBeNull();
    expect(meal?.members[0]?.fatG).toBeNull();
    expect(meal?.members[0]?.satietyScore).toBeNull();
  });

  test('leaves macro fields null when recipe nutrition is missing', async () => {
    const mockQuery = createMockQuery();
    const recipe = {
      ...accessibleRecipeRow,
      satiety_score: null,
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
    };
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([recipe]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.members[0]?.satietyScore).toBeNull();
    expect(meal?.members[0]?.calories).toBeNull();
    expect(meal?.members[0]?.proteinG).toBeNull();
    expect(meal?.members[0]?.carbsG).toBeNull();
    expect(meal?.members[0]?.fatG).toBeNull();
  });

  test('leaves nutrition fields null when status is missing', async () => {
    const mockQuery = createMockQuery();
    const recipe = {...accessibleRecipeRow, nutrition_status: null};
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
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
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meals = await listMealsForUser(USER_ID, mockQuery);
    expect(meals).toHaveLength(1);
    expect(meals[0]?.title).toBe('Sunday Dinner');
  });
});

describe('loadMealDetail direct ingredients (#362)', () => {
  test('loads a direct-only meal with hand-computed nutrition totals', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([mealIngredientRow]));

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.members).toHaveLength(0);
    expect(meal?.ingredients).toHaveLength(1);
    expect(meal?.ingredients[0]).toMatchObject({
      name: 'Rice',
      quantity: 2,
      unit: 'cups',
      servingsToCook: 2,
      servingsToEat: 2,
      calories: 200,
    });
    expect(meal?.memberCount).toBe(1);
    // A direct-only meal has no recipe members (#498).
    expect(meal?.recipeCount).toBe(0);
    // Per-serving 200 cal × servings eaten 2 = 400; weight is the
    // whole-entry 300 g × (eat 2 / cook 2), so also unchanged. This is
    // the #363 backfill case: eat = cook reproduces the old numbers.
    expect(meal?.nutrition).toMatchObject({
      calories: 400,
      proteinG: 8,
      carbsG: 88,
      fatG: 2,
      fiberG: 2,
      sugarG: 0,
      sodiumMg: 10,
      preparedWeightG: 300,
      status: 'ready',
    });
  });

  test('maps a direct ingredient with no nutrition status to null', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([{...mealIngredientRow, nutrition_status: null}]),
      );

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.ingredients).toHaveLength(1);
    expect(meal?.ingredients[0]?.nutritionStatus).toBeNull();
  });

  test('sums recipes and direct ingredients in a mixed meal', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(makeQueryResult([mealIngredientRow]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.members).toHaveLength(1);
    expect(meal?.ingredients).toHaveLength(1);
    expect(meal?.memberCount).toBe(2);
    // Only the recipe member counts toward the recipe count (#498):
    // a meal of 1 recipe + 1 direct ingredient reads "1 recipe".
    expect(meal?.recipeCount).toBe(1);
    // Recipe: 100 cal/serving × 4 servings = 400 cal, 40 protein,
    // 20 carbs, 8 fat, 400 g. Direct: 400 cal, 8 protein, 88 carbs,
    // 2 fat, 2 fiber, 10 sodium, 300 g (see fixture).
    expect(meal?.nutrition).toMatchObject({
      calories: 800,
      proteinG: 48,
      carbsG: 108,
      fatG: 10,
      fiberG: 2,
      sugarG: 0,
      sodiumMg: 10,
      preparedWeightG: 700,
      status: 'ready',
    });
  });

  test('marks totals partial when a direct ingredient has no ready nutrition', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            ...mealIngredientRow,
            calories: null,
            protein_g: null,
            carbs_g: null,
            fat_g: null,
            fiber_g: null,
            sugar_g: null,
            sodium_mg: null,
            prepared_weight_g: null,
            satiety_score: null,
            nutrition_status: 'failed',
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant);

    const meal = await loadMealDetail(MEAL_ID, USER_ID, mockQuery);
    expect(meal?.nutrition?.status).toBe('partial');
    expect(meal?.nutrition?.calories).toBe(400);
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
          servingsToCook: 4,
          servingsToEat: 4,
          title: 'Soup',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          satietyScore: 50,
          nutritionStatus: 'ready',
          calories: 100,
          proteinG: 10,
          carbsG: 5,
          fatG: 2,
        },
      ],
      recipesById,
    );
    expect(nutrition.calories).toBeGreaterThan(0);
  });

  test('scales direct ingredients by their own entry-level servings', () => {
    const nutrition = nutritionFromMembers([], new Map(), [
      {
        name: 'Rice',
        quantity: 2,
        unit: 'cups',
        sortOrder: 0,
        servingsToCook: 3,
        servingsToEat: 3,
        satietyScore: 60,
        nutritionStatus: 'ready',
        calories: 200,
        proteinG: 4,
        carbsG: 44,
        fatG: 1,
        fiberG: 1,
        sugarG: 0,
        sodiumMg: 5,
        preparedWeightG: 300,
      },
    ]);
    // 200 cal × 3 servings eaten; the 300 g stored weight covers the
    // 3 servings cooked, and eat = cook, so it is not scaled either.
    expect(nutrition).toMatchObject({
      calories: 600,
      proteinG: 12,
      preparedWeightG: 300,
      status: 'ready',
    });
  });

  test('scales members by servings-to-eat, not servings-to-cook (#363)', () => {
    const recipesById = new Map([[RECIPE_ID, accessibleRecipeRow]]);
    const nutrition = nutritionFromMembers(
      [
        {
          recipeId: RECIPE_ID,
          sortOrder: 0,
          servingsToCook: 8,
          servingsToEat: 2,
          title: 'Soup',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          satietyScore: 50,
          nutritionStatus: 'ready',
          calories: 100,
          proteinG: 10,
          carbsG: 5,
          fatG: 2,
        },
      ],
      recipesById,
    );
    // Per-serving 100 cal × 2 eaten = 200 (not × 8 cooked); the whole
    // recipe's 400 g scales by 2 eaten / 4 recipe servings = 200 g.
    expect(nutrition).toMatchObject({
      calories: 200,
      proteinG: 20,
      preparedWeightG: 200,
      status: 'ready',
    });
  });

  test('scales a direct ingredient proportionally eat/cook (#363)', () => {
    const nutrition = nutritionFromMembers([], new Map(), [
      {
        name: 'Rice',
        quantity: 2,
        unit: 'cups',
        sortOrder: 0,
        servingsToCook: 4,
        servingsToEat: 1,
        satietyScore: 60,
        nutritionStatus: 'ready',
        calories: 200,
        proteinG: 4,
        carbsG: 44,
        fatG: 1,
        fiberG: 1,
        sugarG: 0,
        sodiumMg: 5,
        preparedWeightG: 300,
      },
    ]);
    // Per-serving macros × 1 eaten; the 300 g whole-cooked-entry
    // weight scales by eat / cook = 1/4.
    expect(nutrition).toMatchObject({
      calories: 200,
      proteinG: 4,
      preparedWeightG: 75,
      status: 'ready',
    });
  });
});
