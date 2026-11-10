import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {quotaExhaustedBody, withRecipeCap} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import {
  autoImageContextFromDetail,
  scheduleAutoGenerateRecipeImage,
} from '../../lib/autoGenerateRecipeImage.js';
import {saveNewRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {RecipeInputSchema, validate} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

export const createRecipe = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  // Free plan is capped at 50 recipes. Downgraded users keep everything —
  // creation 402s until they are back under the cap. The check and the
  // insert share a transaction (see withRecipeCap) so concurrent requests
  // can't race past the limit.
  const result = await withRecipeCap(
    req.userId,
    req.entitlement.plan,
    queryFn,
    async q => {
      const {recipeId, versionId, recipe} = await saveNewRecipeFromInput(
        {userId: req.userId, input: body.data, createdVia: 'manual'},
        q,
      );
      return {recipeId, versionId, recipe};
    },
  );
  if (!result.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('recipe_limit', result.used, result.limit));
    return;
  }
  const {recipeId, versionId, recipe} = result.value;
  // #407: a recipe saved without an image gets one generated for it,
  // async and best-effort — the save response never waits on or fails
  // because of generation.
  scheduleAutoGenerateRecipeImage(
    {
      userId: req.userId,
      supabaseUid: req.supabaseUid,
      recipe: autoImageContextFromDetail(recipe),
    },
    queryFn,
  );
  res.status(201).json({...recipe, recipeId, versionId});
};
