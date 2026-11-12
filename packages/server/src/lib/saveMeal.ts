import type {MealDetail, MealInput} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {runTransactional} from '../db/withTransaction.js';

import {
  staleWriteConflict,
  updatedAtMatches,
  updatedAtToken,
} from './conditionalWrite.js';
import {loadMealDetail} from './loadMealDetail.js';
import {
  estimateMealIngredientNutrition,
  type MealIngredientNutrition,
} from './mealIngredientNutrition.js';
import {loadAccessibleRecipe} from './mealRecipeAccess.js';

type QueryFn = typeof defaultQuery;

type ResolvedMealRecipe = {
  recipeId: string;
  servingsToCook: number;
  servingsToEat: number;
  sortOrder: number;
};

type ResolvedMealIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  servingsToCook: number;
  servingsToEat: number;
  sortOrder: number;
  nutrition: MealIngredientNutrition;
};

const INSERT_MEAL_INGREDIENT_SQL = `
  insert into meal_ingredients
    (meal_id, name, quantity, unit, servings, servings_to_eat, sort_order,
     calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg,
     prepared_weight_g, satiety_score, nutrition_status,
     nutrition_disclaimer, nutrition_updated_at)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, now())
`;

const insertMealIngredient = async (
  queryFn: QueryFn,
  mealId: string,
  ingredient: ResolvedMealIngredient,
) => {
  const {nutrition} = ingredient;
  await queryFn(INSERT_MEAL_INGREDIENT_SQL, [
    mealId,
    ingredient.name,
    ingredient.quantity,
    ingredient.unit,
    ingredient.servingsToCook,
    ingredient.servingsToEat,
    ingredient.sortOrder,
    nutrition.calories,
    nutrition.proteinG,
    nutrition.carbsG,
    nutrition.fatG,
    nutrition.fiberG,
    nutrition.sugarG,
    nutrition.sodiumMg,
    nutrition.preparedWeightG,
    nutrition.satietyScore,
    nutrition.nutritionStatus,
    nutrition.nutritionDisclaimer,
  ]);
};

/**
 * Resolve direct-ingredient entries for a save (#362): default the entry-level
 * servings and estimate + attach each entry's nutrition via the recipe lookup.
 * Runs before any write, alongside recipe resolution, so a rejected save never
 * leaves partial members behind.
 */
const resolveMealIngredients = async (
  input: MealInput,
): Promise<ResolvedMealIngredient[]> => {
  const resolved: ResolvedMealIngredient[] = [];
  for (const [index, ingredient] of (input.ingredients ?? []).entries()) {
    // Legacy `servings` is the pre-#363 alias for servingsToCook.
    const servingsToCook =
      ingredient.servingsToCook ?? ingredient.servings ?? 1;
    // Eat defaults to cook (#363) when the client sends only one number.
    const servingsToEat = ingredient.servingsToEat ?? servingsToCook;
    // Nutrition is estimated at servings-to-cook: the entry's quantity
    // is the amount cooked, and aggregation re-scales it to eat.
    const nutrition = await estimateMealIngredientNutrition({
      name: ingredient.name,
      quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null,
      servings: servingsToCook,
    });
    resolved.push({
      name: ingredient.name,
      quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null,
      servingsToCook,
      servingsToEat,
      sortOrder: index,
      nutrition,
    });
  }
  return resolved;
};

export const saveNewMeal = async (
  userId: string,
  input: MealInput,
  queryFn: QueryFn = defaultQuery,
): Promise<{meal: MealDetail} | {error: string; status: number}> => {
  // The schema defers the at-least-one-member rule when `ingredients`
  // is omitted (a PUT may be preserving stored rows — see replaceMeal);
  // a create has no stored rows, so the rule is enforced here.
  if (input.recipes.length === 0 && (input.ingredients ?? []).length === 0) {
    return {
      error: 'A meal must contain at least one recipe or ingredient',
      status: 400,
    };
  }
  const resolved: ResolvedMealRecipe[] = [];
  for (const [index, recipe] of input.recipes.entries()) {
    const accessible = await loadAccessibleRecipe(
      recipe.recipeId,
      userId,
      queryFn,
    );
    if (!accessible) {
      return {
        error: `Recipe not found or not accessible: ${recipe.recipeId}`,
        status: 400,
      };
    }
    // Legacy `servings` is the pre-#363 alias for servingsToCook.
    const servingsToCook =
      recipe.servingsToCook ?? recipe.servings ?? accessible.servings;
    resolved.push({
      recipeId: recipe.recipeId,
      servingsToCook,
      servingsToEat: recipe.servingsToEat ?? servingsToCook,
      sortOrder: index,
    });
  }
  const resolvedIngredients = await resolveMealIngredients(input);

  const mealResult = await queryFn(
    `insert into meals (user_id, title, notes)
     values ($1, $2, $3)
     returning id`,
    [userId, input.title, input.notes ?? null],
  );
  const mealId = (mealResult.rows[0] as {id: string}).id;

  for (const recipe of resolved) {
    await queryFn(
      `insert into meal_recipes
         (meal_id, recipe_id, sort_order, servings, servings_to_eat)
       values ($1, $2, $3, $4, $5)`,
      [
        mealId,
        recipe.recipeId,
        recipe.sortOrder,
        recipe.servingsToCook,
        recipe.servingsToEat,
      ],
    );
  }
  for (const ingredient of resolvedIngredients) {
    await insertMealIngredient(queryFn, mealId, ingredient);
  }

  const meal = await loadMealDetail(mealId, userId, queryFn);
  if (!meal) {
    return {error: 'Failed to load meal', status: 500};
  }
  return {meal};
};

export const replaceMeal = async (
  mealId: string,
  userId: string,
  input: MealInput & {expectedUpdatedAts?: string[]},
  queryFn: QueryFn = defaultQuery,
): Promise<{meal: MealDetail} | {error: string; status: number}> => {
  const existing = await queryFn(
    `select id, updated_at from meals where id = $1 and user_id = $2`,
    [mealId, userId],
  );
  const existingRow = existing.rows[0] as
    {id: string; updated_at: string | Date} | undefined;
  if (!existingRow) {
    return {error: 'Meal not found', status: 404};
  }
  // Optimistic concurrency (#384): a client that read the meal and merged
  // sends its `updatedAt` back (the routers resolve the If-Match header
  // and the expectedUpdatedAt body field into expectedUpdatedAts; direct
  // callers may pass the single body field). If-Match succeeds when ANY
  // candidate matches; if none does, the stored record has moved since
  // that read, so refuse before any write — the caller can re-read,
  // re-merge, and retry instead of silently overwriting.
  const expectedTokens =
    input.expectedUpdatedAts ??
    (input.expectedUpdatedAt ? [input.expectedUpdatedAt] : []);
  if (
    expectedTokens.length > 0 &&
    !expectedTokens.some(token =>
      updatedAtMatches(existingRow.updated_at, token),
    )
  ) {
    return staleWriteConflict('Meal');
  }

  // Direct ingredients are full-replace only when the client sends
  // them (#432): an omitted `ingredients` preserves the stored rows.
  // The MCP client's read-merge-PUT (update_meal, add_recipe_to_meal,
  // remove_recipe_from_meal) historically sent only title/notes/recipes,
  // and defaulting a missing list to [] silently deleted a mixed meal's
  // direct ingredients. A sent list — [] included — still replaces.
  const preserveIngredients = input.ingredients === undefined;

  const resolved: ResolvedMealRecipe[] = [];
  for (const [index, recipe] of input.recipes.entries()) {
    const accessible = await loadAccessibleRecipe(
      recipe.recipeId,
      userId,
      queryFn,
    );
    if (!accessible) {
      return {
        error: `Recipe not found or not accessible: ${recipe.recipeId}`,
        status: 400,
      };
    }
    // Legacy `servings` is the pre-#363 alias for servingsToCook.
    const servingsToCook =
      recipe.servingsToCook ?? recipe.servings ?? accessible.servings;
    resolved.push({
      recipeId: recipe.recipeId,
      servingsToCook,
      servingsToEat: recipe.servingsToEat ?? servingsToCook,
      sortOrder: index,
    });
  }
  // Direct ingredients resolve (and estimate) here too — after the
  // stale-token check above, before any write — so a 409 writes nothing
  // and spends no estimation calls. When they are preserved (omitted),
  // nothing resolves and no estimation is spent.
  const resolvedIngredients = preserveIngredients
    ? []
    : await resolveMealIngredients(input);

  // The token is bound into the UPDATE itself, so the check above is only
  // a fast path: if a concurrent write lands between it and this update,
  // the predicate no longer matches and the update writes no row. The
  // comparison truncates the stored timestamp to milliseconds because
  // that is the precision of the token the API hands out (a stored
  // timestamptz can carry microseconds). The early check guarantees any
  // token reaching this cast has already normalized to a real timestamp,
  // so a malformed token cannot get here — it 409s above. Without a
  // token the predicate is null and the write stays unconditional.
  // The SET clause also guarantees the version strictly advances:
  // now() can land in the same millisecond as the previous write, which
  // would hand the next reader the same token and let a stale token
  // match again, so updated_at moves to at least one millisecond past
  // the previous token.
  // Only tokens that parse as timestamps can be cast for the predicate;
  // a malformed candidate can never match a stored timestamp, and the
  // check above has already refused when no candidate matched, so a
  // non-empty list always leaves at least one castable token here.
  const castableTokens = expectedTokens
    .map(token => updatedAtToken(token))
    .filter(token => !Number.isNaN(Date.parse(token)));
  const expectedUpdatedAts = castableTokens.length > 0 ? castableTokens : null;

  // The update, member delete, and replacement inserts are one
  // transaction (#403): a concurrent meal-detail read must never observe
  // the intermediate state between the delete and the inserts (an empty
  // member list), and a failed insert must not leave the meal updated
  // with its members deleted or partially replaced. The existence and
  // accessibility reads above stay outside the transaction, and the
  // post-save detail load below keeps its existing semantics.
  const outcome = await runTransactional(queryFn, async q => {
    if (preserveIngredients && input.recipes.length === 0) {
      // The schema deferred the at-least-one-member rule for an omitted
      // `ingredients` list; validate it against the stored rows INSIDE
      // the transaction, after locking the meal row (#432). Checking
      // before the lock raced a concurrent replacement: both writers
      // could pass against the old rows, after which the preserving
      // writer deleted the other's recipe member and preserved
      // ingredients that were no longer there, leaving zero members.
      // Locked first, the check observes the state the lock protects;
      // returning here has written nothing, so the commit is a no-op.
      await q(
        `select id from meals where id = $1 and user_id = $2 for update`,
        [mealId, userId],
      );
      const storedIngredients = await q(
        `select 1 from meal_ingredients where meal_id = $1 limit 1`,
        [mealId],
      );
      if (!storedIngredients.rows[0]) {
        return 'no-members' as const;
      }
    }
    // The token must advance monotonically at its millisecond precision —
    // the same expression as the #394 delete trigger and
    // touchMealsForRecipe — so a save that lands in the same millisecond
    // as the meal's previous update (e.g. right after the trigger bumped
    // the token for a member-recipe delete) never reissues the earlier
    // ETag.
    const updated = await q(
      `update meals
       set title = $3, notes = $4,
           updated_at = greatest(now(), date_trunc('milliseconds', updated_at) + interval '1 millisecond')
       where id = $1 and user_id = $2
         and ($5::timestamptz[] is null
           or date_trunc('milliseconds', updated_at) = ANY($5::timestamptz[]))`,
      [mealId, userId, input.title, input.notes ?? null, expectedUpdatedAts],
    );
    if (expectedUpdatedAts && updated.rowCount === 0) {
      // A concurrent write (or delete) won the race after the check
      // above; nothing else is written.
      return 'conflict' as const;
    }
    await q(`delete from meal_recipes where meal_id = $1`, [mealId]);
    if (!preserveIngredients) {
      await q(`delete from meal_ingredients where meal_id = $1`, [mealId]);
    }
    for (const recipe of resolved) {
      await q(
        `insert into meal_recipes
           (meal_id, recipe_id, sort_order, servings, servings_to_eat)
         values ($1, $2, $3, $4, $5)`,
        [
          mealId,
          recipe.recipeId,
          recipe.sortOrder,
          recipe.servingsToCook,
          recipe.servingsToEat,
        ],
      );
    }
    for (const ingredient of resolvedIngredients) {
      await insertMealIngredient(q, mealId, ingredient);
    }
    return 'ok' as const;
  });
  if (outcome === 'conflict') {
    return staleWriteConflict('Meal');
  }
  if (outcome === 'no-members') {
    return {
      error: 'A meal must contain at least one recipe or ingredient',
      status: 400,
    };
  }

  const meal = await loadMealDetail(mealId, userId, queryFn);
  if (!meal) {
    return {error: 'Failed to load meal', status: 500};
  }
  return {meal};
};

export const deleteMeal = async (
  mealId: string,
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<{ok: true} | {error: string; status: number}> => {
  const referenced = await queryFn(
    `select 1 from meal_plan_entries where meal_id = $1 limit 1`,
    [mealId],
  );
  if (referenced.rows[0]) {
    return {error: 'Meal is referenced by a meal plan', status: 409};
  }

  const result = await queryFn(
    `delete from meals where id = $1 and user_id = $2`,
    [mealId, userId],
  );
  if (result.rowCount === 0) {
    return {error: 'Meal not found', status: 404};
  }
  return {ok: true};
};
