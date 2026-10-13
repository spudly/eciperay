import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  cloneRecipeForUser,
  RecipeAccessDeniedError,
} from '../../lib/cloneRecipe.js';
import {getParam} from '../../lib/getParam.js';
import {getShareTokenFromQuery} from '../../lib/getShareTokenFromQuery.js';
import {RecipeNotFoundError} from '../../lib/saveRecipeFromInput.js';
import {RecipeCloneSchema, validate} from '../../lib/schemas.js';
import {quotaExhaustedBody, withRecipeCap} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';

type QueryFn = typeof defaultQuery;

export const cloneRecipe = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeCloneSchema, req, res);
  if (!body.ok) {
    return;
  }

  const shareToken = body.data.shareToken ?? getShareTokenFromQuery(req);

  try {
    // Cloning creates a new recipe lineage, so the Free recipe cap applies.
    const result = await withRecipeCap(
      req.userId,
      req.entitlement.plan,
      queryFn,
      q => cloneRecipeForUser(getParam(req, 'id'), req.userId, shareToken, q),
    );
    if (!result.ok) {
      res
        .status(402)
        .json(quotaExhaustedBody('recipe_limit', result.used, result.limit));
      return;
    }
    const recipe = result.value;
    res
      .status(201)
      .json({...recipe, recipeId: recipe.id, versionId: recipe.versionId});
  } catch (error) {
    if (error instanceof RecipeNotFoundError) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }
    /* c8 ignore next 5 -- defensive: only known error types are thrown in practice */
    if (error instanceof RecipeAccessDeniedError) {
      res.status(403).json({error: 'Recipe access denied'});
      return;
    }
    throw error;
  }
};
