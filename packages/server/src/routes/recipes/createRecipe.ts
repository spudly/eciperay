import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {checkRecipeCap, quotaExhaustedBody} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
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
  // creation 402s until they are back under the cap.
  const cap = await checkRecipeCap(req.userId, req.entitlement.plan, queryFn);
  if (!cap.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('recipe_limit', cap.used, cap.limit));
    return;
  }
  const {recipeId, versionId, recipe} = await saveNewRecipeFromInput(
    {userId: req.userId, input: body.data, createdVia: 'manual'},
    queryFn,
  );
  res.status(201).json({...recipe, recipeId, versionId});
};
