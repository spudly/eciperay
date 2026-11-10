import {query as defaultQuery} from '../db/query.js';
import {setVersionImageUrlIfEmpty} from '../routes/recipes/queries.js';

import {consumeAiCall, refundAiCall} from './aiMetering.js';
import {serializeErrorForLog} from './aiServiceDiagnostics.js';
import {generateRecipeImagePrompt} from './generateRecipeImagePrompt.js';
import {generateRecipeImageWithOpenAi} from './generateRecipeImageWithOpenAi.js';
import {resolveEntitlement} from './plans.js';
import {serverLog} from './posthogLogs.js';
import {uploadRecipeImageBuffer} from './uploadRecipeImageServer.js';

type QueryFn = typeof defaultQuery;

/**
 * The saved-recipe context the auto-generation trigger needs. Built by the save
 * handlers (create / full update / metadata update / version update) from the
 * detail they already return, so web, app, and MCP saves — all of which go
 * through those routes — are covered in one place (#407).
 */
export type AutoImageRecipeContext = {
  recipeId: string;
  versionId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ingredients: {name: string; quantity?: number | null; unit?: string | null}[];
  instructions: string[];
};

/** Builds the trigger context from a saved recipe/version detail. */
export const autoImageContextFromDetail = (detail: {
  id?: string;
  recipeId?: string;
  versionId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ingredients: {name: string; quantity?: number | null; unit?: string | null}[];
  instructions: {body: string}[] | string[];
}): AutoImageRecipeContext => ({
  recipeId: detail.recipeId ?? detail.id ?? '',
  versionId: detail.versionId,
  title: detail.title,
  description: detail.description,
  imageUrl: detail.imageUrl,
  ingredients: detail.ingredients,
  instructions: detail.instructions.map(ins =>
    typeof ins === 'string' ? ins : ins.body,
  ),
});

export type AutoGenerateRecipeImageArgs = {
  userId: string;
  supabaseUid: string;
  recipe: AutoImageRecipeContext;
};

/**
 * Injectable seams for tests. The defaults are the exact machinery the explicit
 * "Generate with AI" action uses (#407: no new generation code) — the Anthropic
 * prompt builder, the OpenAI renderer, the same AI metering / entitlement
 * gating, and the same server upload path (same storage path,
 * `${supabaseUid}/${recipeId}` in the recipe-images bucket), so an
 * auto-generated image is indistinguishable in provenance from an explicitly
 * generated one.
 */
export type AutoGenerateRecipeImageDeps = {
  generatePrompt: typeof generateRecipeImagePrompt;
  generateImage: typeof generateRecipeImageWithOpenAi;
  uploadImage: typeof uploadRecipeImageBuffer;
  consume: typeof consumeAiCall;
  refund: typeof refundAiCall;
  resolveEntitlementFn: typeof resolveEntitlement;
};

const defaultDeps: AutoGenerateRecipeImageDeps = {
  generatePrompt: generateRecipeImagePrompt,
  generateImage: generateRecipeImageWithOpenAi,
  uploadImage: uploadRecipeImageBuffer,
  consume: consumeAiCall,
  refund: refundAiCall,
  resolveEntitlementFn: resolveEntitlement,
};

export type AutoGenerateOutcome =
  | 'attached'
  | 'skipped-has-image'
  | 'skipped-already-attempted'
  | 'skipped-quota-exhausted'
  | 'skipped-image-raced'
  | 'failed';

const CLAIM_ATTEMPT_SQL = `
  update recipes
     set auto_image_attempted_at = now()
   where id = $1 and auto_image_attempted_at is null
   returning id
`;

/**
 * Generates and attaches an image for a just-saved recipe that has none.
 *
 * Best-effort by contract: this NEVER throws — the save has already completed,
 * and a generation failure or timeout must leave the saved recipe intact and
 * imageless, with the failure logged server-side.
 *
 * Once-per-recipe guard: the attempt is claimed atomically (a conditional
 * UPDATE on recipes.auto_image_attempted_at, migration 022) BEFORE any AI call,
 * so concurrent saves and every later edit save see the claim and skip. The
 * claim stands even when generation fails or quota is exhausted — at most one
 * auto-generation per recipe, per the approved plan.
 */
export const autoGenerateRecipeImage = async (
  args: AutoGenerateRecipeImageArgs,
  queryFn: QueryFn = defaultQuery,
  deps: AutoGenerateRecipeImageDeps = defaultDeps,
): Promise<AutoGenerateOutcome> => {
  const {recipe} = args;
  if (recipe.imageUrl) {
    return 'skipped-has-image';
  }
  let periodStart: string | undefined;
  let consumed = false;
  try {
    const claimed = await queryFn(CLAIM_ATTEMPT_SQL, [recipe.recipeId]);
    if (!claimed.rows[0]) {
      return 'skipped-already-attempted';
    }
    // Same AI gating/entitlement as the explicit generate action: resolve
    // the saver's entitlement here (inside the background job, so the save
    // routes need no new middleware) and meter through consumeAiCall.
    const entitlement = await deps.resolveEntitlementFn(args.userId, queryFn);
    const quota = await deps.consume(args.userId, entitlement.plan, queryFn, {
      unlimited: entitlement.unlimited,
    });
    if (!quota.ok) {
      serverLog('info', 'Auto recipe image generation skipped: quota', {
        recipeId: recipe.recipeId,
      });
      return 'skipped-quota-exhausted';
    }
    consumed = true;
    periodStart = quota.periodStart;

    const prompt = await deps.generatePrompt({
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
    });
    const image = await deps.generateImage(prompt);
    const imageUrl = await deps.uploadImage(
      args.supabaseUid,
      recipe.recipeId,
      Buffer.from(image.imageBase64, 'base64'),
      image.contentType,
    );
    // Attach only if the version is still imageless: a photo the user
    // uploaded while generation was running must never be overwritten.
    const attached = await setVersionImageUrlIfEmpty(
      recipe.versionId,
      imageUrl,
      queryFn,
    );
    if (!attached.rows[0]) {
      serverLog('info', 'Auto recipe image discarded: image already set', {
        recipeId: recipe.recipeId,
      });
      return 'skipped-image-raced';
    }
    serverLog('info', 'Auto recipe image generated and attached', {
      recipeId: recipe.recipeId,
    });
    return 'attached';
  } catch (error) {
    if (consumed) {
      // A failed provider call must not burn quota (same rule as the
      // explicit generate route).
      await deps
        .refund(args.userId, queryFn, periodStart)
        .catch(() => undefined);
    }
    serverLog('warn', 'Auto recipe image generation failed', {
      recipeId: recipe.recipeId,
      ...serializeErrorForLog(error),
    });
    return 'failed';
  }
};

/**
 * Fire-and-forget scheduling, mirroring scheduleNutritionRefresh: deferred with
 * setImmediate so the save response is never blocked, and skipped in Jest unit
 * tests (the core above is covered directly by its own tests).
 */
export const scheduleAutoGenerateRecipeImage = (
  args: AutoGenerateRecipeImageArgs,
  queryFn: QueryFn = defaultQuery,
) => {
  if (args.recipe.imageUrl) {
    return;
  }
  if (process.env['JEST_WORKER_ID'] !== undefined) {
    return;
  }
  setImmediate(() => {
    void autoGenerateRecipeImage(args, queryFn).catch((error: unknown) => {
      serverLog('error', 'Auto recipe image generation crashed', {
        recipeId: args.recipe.recipeId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    });
  });
};
