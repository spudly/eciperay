import type {
  MealDetail,
  MealInput,
  MealPlanDetail,
  MealPlanEntry,
  MealPlanInput,
} from '@eciperay/types';

import type {ApiError} from './createApiClient.js';
import {mealPlanEntryKey} from './mealUiHelpers.js';

/**
 * Inline meal plan editing (#646, tranche 1): the pure core of
 * the view-page editor. The DS MealPlanDetailPage reports
 * intents (add/delete/servings); the hosts turn each intent
 * into one of the edits below, apply it to the in-memory
 * MealPlanDetail, rebuild the whole-plan input, and PUT it —
 * the API is whole-plan only, so every plan edit reduces to
 * this rebuild (array order = plan order, `day` per entry).
 *
 * Client-side entry keys: server entry ids are NOT preserved
 * across a save (saveMealPlan deletes and re-inserts all
 * entries), so hosts must key selection/drag state on
 * `meal:<mealId>` / `recipe:<recipeId>` plus the entry's day —
 * never on the server entry id. `mealPlanEntryClientKey` is
 * that key.
 */

export const mealPlanEntryClientKey = (entry: MealPlanEntry): string =>
  `${mealPlanEntryKey(
    entry.type,
    entry.type === 'meal' ? entry.mealId : entry.recipeId,
  )}@${entry.day ?? ''}`;

/** One inline edit to a plan's entries. */
export type MealPlanEntryEdit =
  | {type: 'add'; entry: MealPlanEntry}
  | {type: 'delete'; clientKey: string}
  | {type: 'setQuantity'; clientKey: string; quantity: number}
  | {
      type: 'setRecipeServings';
      clientKey: string;
      servingsToCook: number;
      servingsToEat: number;
    }
  | {type: 'moveToDay'; clientKey: string; day: string | null};

/** Apply one edit to a plan's entries, returning a new array
 * (the input plan is not mutated). Edits address entries by
 * client key, so they survive the id churn of a save — which
 * is also what makes the 409 rebase below possible: the same
 * edit replays onto the refetched plan. */
export const applyMealPlanEntryEdit = (
  entries: MealPlanEntry[],
  edit: MealPlanEntryEdit,
): MealPlanEntry[] => {
  if (edit.type === 'add') {
    return [...entries, edit.entry];
  }
  return entries.map(entry => {
    if (mealPlanEntryClientKey(entry) !== edit.clientKey) {
      return entry;
    }
    switch (edit.type) {
      case 'delete':
        return null;
      case 'setQuantity':
        return {...entry, quantity: edit.quantity};
      case 'setRecipeServings':
        return entry.type === 'recipe'
          ? {
              ...entry,
              servingsToCook: edit.servingsToCook,
              servingsToEat: edit.servingsToEat,
            }
          : entry;
      case 'moveToDay':
        return {...entry, day: edit.day};
      default:
        return entry;
    }
  }).filter((entry): entry is MealPlanEntry => entry !== null);
};

/** Apply one edit to a whole plan detail. */
export const applyMealPlanEdit = (
  plan: MealPlanDetail,
  edit: MealPlanEntryEdit,
): MealPlanDetail => ({
  ...plan,
  entries: applyMealPlanEntryEdit(plan.entries, edit),
});

/**
 * Rebuild the whole-plan PUT input from a plan detail: title,
 * notes, and dates ride along unchanged; entries map in array
 * order (the server re-inserts in input order, so array order
 * IS the plan order), each carrying its `day`. The plan's
 * current `updatedAt` becomes `expectedUpdatedAt` — the
 * optimistic-concurrency token the server checks.
 */
export const buildMealPlanInputFromDetail = (
  plan: MealPlanDetail,
): MealPlanInput => ({
  title: plan.title,
  notes: plan.notes,
  startsOn: plan.startsOn,
  endsOn: plan.endsOn,
  expectedUpdatedAt: plan.updatedAt,
  entries: plan.entries.map(entry =>
    entry.type === 'meal'
      ? {mealId: entry.mealId, quantity: entry.quantity, day: entry.day}
      : {
          recipeId: entry.recipeId,
          quantity: entry.quantity,
          servingsToCook: entry.servingsToCook,
          servingsToEat: entry.servingsToEat,
          day: entry.day,
        },
  ),
});

/** True when an API error is the plan/meal PUT's 409 conflict
 * (a stale `expectedUpdatedAt`). */
export const isConflictError = (error: unknown): boolean =>
  (error as ApiError | null | undefined)?.status === 409;

/**
 * Save one inline plan edit with the tranche-1 409 protocol:
 * apply the edit to the in-memory plan, rebuild the input, and
 * PUT it. On a 409 the plan changed elsewhere — refetch it,
 * rebase the SAME single edit onto the fresh plan (possible
 * because edits address entries by client key, not server id),
 * and PUT once more. A second conflict, or any other error,
 * propagates to the caller, which surfaces it and keeps the
 * refetched plan if one was loaded.
 */
export const saveMealPlanEdit = async (args: {
  plan: MealPlanDetail;
  edit: MealPlanEntryEdit;
  put: (id: string, input: MealPlanInput) => Promise<MealPlanDetail>;
  refetch: (id: string) => Promise<MealPlanDetail>;
}): Promise<MealPlanDetail> => {
  const edited = applyMealPlanEdit(args.plan, args.edit);
  try {
    return await args.put(edited.id, buildMealPlanInputFromDetail(edited));
  } catch (error) {
    if (!isConflictError(error)) {
      throw error;
    }
    const fresh = await args.refetch(args.plan.id);
    const rebased = applyMealPlanEdit(fresh, args.edit);
    return args.put(rebased.id, buildMealPlanInputFromDetail(rebased));
  }
};

/**
 * Meal-content edits (#646, tranche 1): recipes inside a meal
 * are edited through the meals API's whole-object PUT. These
 * builders turn a MealDetail plus one member edit into the
 * MealInput for that PUT — title/notes ride along, every other
 * member keeps its servings, and the meal's current
 * `updatedAt` becomes `expectedUpdatedAt`. Editing a member
 * edits the SHARED meal (every plan using it) — the DS page
 * labels that through the entry's shared-meal note; there is
 * deliberately no fork here (approved lean, open question 1).
 */
export const buildMealInputFromDetail = (meal: MealDetail): MealInput => ({
  title: meal.title,
  notes: meal.notes,
  expectedUpdatedAt: meal.updatedAt,
  recipes: meal.members.map(member => ({
    recipeId: member.recipeId,
    servingsToCook: member.servingsToCook,
    servingsToEat: member.servingsToEat,
  })),
  ingredients: meal.ingredients.map(ingredient => ({
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    servingsToCook: ingredient.servingsToCook,
    servingsToEat: ingredient.servingsToEat,
  })),
});

export const buildMealInputWithMemberServings = (
  meal: MealDetail,
  recipeId: string,
  servings: {servingsToCook: number; servingsToEat: number},
): MealInput => {
  const input = buildMealInputFromDetail(meal);
  return {
    ...input,
    recipes: input.recipes.map(member =>
      member.recipeId === recipeId ? {...member, ...servings} : member,
    ),
  };
};

export const buildMealInputWithoutMember = (
  meal: MealDetail,
  recipeId: string,
): MealInput => {
  const input = buildMealInputFromDetail(meal);
  return {
    ...input,
    recipes: input.recipes.filter(member => member.recipeId !== recipeId),
  };
};

export const buildMealInputWithAddedRecipe = (
  meal: MealDetail,
  recipeId: string,
  servings?: {servingsToCook: number; servingsToEat: number},
): MealInput => {
  const input = buildMealInputFromDetail(meal);
  if (input.recipes.some(member => member.recipeId === recipeId)) {
    return input;
  }
  return {
    ...input,
    recipes: [
      ...input.recipes,
      {
        recipeId,
        ...(servings
          ? {
              servingsToCook: servings.servingsToCook,
              servingsToEat: servings.servingsToEat,
            }
          : {}),
      },
    ],
  };
};

/** Save one meal-content edit with the same 409 protocol as
 * plan edits: refetch the meal, rebuild the input from the
 * fresh meal through the same builder, PUT once more. */
export const saveMealEdit = async (args: {
  meal: MealDetail;
  buildInput: (meal: MealDetail) => MealInput;
  put: (id: string, input: MealInput) => Promise<MealDetail>;
  refetch: (id: string) => Promise<MealDetail>;
}): Promise<MealDetail> => {
  try {
    return await args.put(args.meal.id, args.buildInput(args.meal));
  } catch (error) {
    if (!isConflictError(error)) {
      throw error;
    }
    const fresh = await args.refetch(args.meal.id);
    return args.put(fresh.id, args.buildInput(fresh));
  }
};
