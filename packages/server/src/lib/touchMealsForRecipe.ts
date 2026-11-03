import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

/**
 * Advance `updated_at` for every meal that has the given recipe as a member
 * (#394). A meal's `updated_at` is its ETag / If-Match token (#384), and meal
 * detail reads member recipes' metadata, so a recipe change that meal detail
 * would reflect must move the token of each member meal — otherwise a stale
 * token can pass If-Match and If-None-Match can return a false 304.
 *
 * The new value is monotonic at the token's millisecond precision
 * (greatest(now(), previous + 1ms)), mirroring the meal replace path in
 * saveMeal, so the token always changes even when the save lands in the same
 * millisecond as the meal's previous update.
 *
 * Callers must pass the query function of the transaction the recipe change
 * itself runs in, so the token bump commits or rolls back atomically with that
 * change.
 */
export const TOUCH_MEALS_FOR_RECIPE_SQL = `
  update meals
  set updated_at = greatest(
    now(),
    date_trunc('milliseconds', updated_at) + interval '1 millisecond'
  )
  where id in (
    select meal_id from meal_recipes where recipe_id = $1
  )
`;

export const touchMealsForRecipe = (recipeId: string, queryFn: QueryFn) =>
  queryFn(TOUCH_MEALS_FOR_RECIPE_SQL, [recipeId]);
