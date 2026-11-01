import type {MealCookPlan} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {buildMealTimeline} from './buildMealTimeline.js';
import {loadMealDetail} from './loadMealDetail.js';
import {loadAccessibleRecipe} from './mealRecipeAccess.js';
import {ensureRecipeStepTiming} from './refreshRecipeStepTiming.js';

type QueryFn = typeof defaultQuery;

export const resolveMealCookTimingStatus = (
  failedCount: number,
  readyCount: number,
  memberCount: number,
): MealCookPlan['timingStatus'] => {
  if (failedCount === 0 && readyCount === memberCount) {
    return 'ready';
  }
  if (failedCount === memberCount) {
    return 'failed';
  }
  return 'partial';
};

const INSTRUCTIONS_SQL = `
  select id, step_number, body, estimated_duration_min
  from instructions
  where recipe_version_id = $1
  order by step_number asc
`;

export const buildMealCookPlan = async (
  mealId: string,
  userId: string,
  queryFn: QueryFn = defaultQuery,
  refresh = false,
): Promise<{plan: MealCookPlan} | {error: string; status: number}> => {
  const meal = await loadMealDetail(mealId, userId, queryFn);
  if (!meal) {
    return {error: 'Meal not found', status: 404};
  }
  if (meal.members.some(member => member.accessLost)) {
    return {
      error: 'One or more recipes in this meal are no longer accessible',
      status: 409,
    };
  }

  const timelineInputs = [];
  let readyCount = 0;
  let failedCount = 0;

  for (const member of meal.members) {
    const recipe = await loadAccessibleRecipe(member.recipeId, userId, queryFn);
    if (!recipe) {
      return {
        error: 'One or more recipes in this meal are no longer accessible',
        status: 409,
      };
    }

    let timingFailed = false;
    try {
      await ensureRecipeStepTiming(
        recipe.version_id,
        recipe.step_timing_status,
        queryFn,
        refresh,
      );
    } catch {
      timingFailed = true;
    }

    const refreshed = await loadAccessibleRecipe(
      member.recipeId,
      userId,
      queryFn,
    );
    if (!refreshed) {
      return {
        error: 'One or more recipes in this meal are no longer accessible',
        status: 409,
      };
    }
    // Step timing is only an estimate overlay: a recipe whose timing is
    // not ready (generation failed or has not completed) still belongs in
    // the cook plan — its steps are included with whatever durations are
    // stored, defaulting to five minutes when none is. Dropping the
    // recipe here is what silently removed every recipe after the first
    // from multi-recipe meals (#346). The failure is still counted so
    // timingStatus reports the plan as partial/failed.
    if (timingFailed || refreshed.step_timing_status !== 'ready') {
      failedCount += 1;
    } else {
      readyCount += 1;
    }

    const instructionsResult = await queryFn(INSTRUCTIONS_SQL, [
      refreshed.version_id,
    ]);
    for (const row of instructionsResult.rows as {
      id: string;
      step_number: number;
      body: string;
      estimated_duration_min: number | null;
    }[]) {
      timelineInputs.push({
        recipeId: member.recipeId,
        recipeTitle: refreshed.title,
        recipeSortOrder: member.sortOrder,
        instructionId: row.id,
        stepNumber: row.step_number,
        body: row.body,
        durationMin: row.estimated_duration_min ?? 5,
      });
    }
  }

  if (timelineInputs.length === 0) {
    return {error: 'Unable to build cook plan for this meal', status: 502};
  }

  const {totalDurationMin, steps} = buildMealTimeline(timelineInputs);
  const timingStatus = resolveMealCookTimingStatus(
    failedCount,
    readyCount,
    meal.members.length,
  );

  return {plan: {mealId, totalDurationMin, steps, timingStatus}};
};
