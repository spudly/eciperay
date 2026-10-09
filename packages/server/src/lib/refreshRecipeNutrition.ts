import type {NutritionInfo} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {anthropic, HAIKU} from './anthropic.js';
import {
  fetchVersionIngredients,
  fetchVersionNutrition,
  mapRowToNutritionInfo,
  markNutritionFailed,
  markNutritionPending,
  UPDATE_VERSION_NUTRITION_SQL,
  type VersionIngredientRow,
} from './nutritionQueries.js';
import {serverLog} from './posthogLogs.js';
import {AiNutritionResponseSchema, parseAiJson} from './schemas.js';
import {calculateSatiety} from './satiety.js';

type QueryFn = typeof defaultQuery;

const PROMPT_TEMPLATE = (ingredients: string, servings: number) =>
  `Estimate nutrition per serving for a recipe with ${servings} servings.
Ingredients: ${ingredients}
Also estimate the prepared edible weight in grams of the entire finished recipe (all servings combined).
Return ONLY JSON: {"calories":n,"proteinG":n,"carbsG":n,"fatG":n,"fiberG":n,"sugarG":n,"sodiumMg":n,"preparedWeightG":n,"disclaimer":"..."}`;

const buildIngredientList = (ingredients: VersionIngredientRow[]) =>
  ingredients
    .map(i => `${i.quantity ?? ''} ${i.unit ?? ''} ${i.name}`.trim())
    .join(', ');

export const estimateNutritionFromAi = async (
  ingredients: VersionIngredientRow[],
  servings: number,
) => {
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: PROMPT_TEMPLATE(buildIngredientList(ingredients), servings),
      },
    ],
  });
  const content = response.content[0];
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  return parseAiJson(AiNutritionResponseSchema, content.text);
};

export const refreshRecipeNutrition = async (
  versionId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<NutritionInfo | null> => {
  const version = await fetchVersionNutrition(versionId, queryFn);
  if (!version) {
    return null;
  }

  await markNutritionPending(versionId, queryFn);

  try {
    const ingredients = await fetchVersionIngredients(versionId, queryFn);
    const estimated = await estimateNutritionFromAi(
      ingredients,
      version.servings,
    );

    const wholeRecipe = {
      calories: estimated.calories * version.servings,
      protein: estimated.proteinG * version.servings,
      fat: estimated.fatG * version.servings,
      totalCarbs: estimated.carbsG * version.servings,
      fiber: (estimated.fiberG ?? 0) * version.servings,
      sugar: (estimated.sugarG ?? 0) * version.servings,
      sodium: (estimated.sodiumMg ?? 0) * version.servings,
      weight: estimated.preparedWeightG,
    };
    const satiety = calculateSatiety(wholeRecipe);

    await queryFn(UPDATE_VERSION_NUTRITION_SQL, [
      versionId,
      estimated.calories,
      estimated.proteinG,
      estimated.carbsG,
      estimated.fatG,
      estimated.fiberG,
      estimated.sugarG,
      estimated.sodiumMg,
      estimated.preparedWeightG,
      satiety.score,
      estimated.disclaimer,
    ]);

    const updated = await fetchVersionNutrition(versionId, queryFn);
    return updated ? mapRowToNutritionInfo(updated) : null;
  } catch (error) {
    await markNutritionFailed(versionId, queryFn);
    throw error;
  }
};

export const scheduleNutritionRefresh = (
  versionId: string,
  queryFn: QueryFn = defaultQuery,
) => {
  // Skip background AI work in Jest unit tests (covered by refreshRecipeNutrition tests).
  if (process.env['JEST_WORKER_ID'] !== undefined) {
    return;
  }
  // Defer so the caller's follow-up queries (e.g. reload detail) finish first.
  setImmediate(() => {
    void refreshRecipeNutrition(versionId, queryFn).catch((error: unknown) => {
      serverLog('error', 'nutrition refresh failed', {
        versionId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    });
  });
};
