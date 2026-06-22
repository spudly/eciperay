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
import type {AuthedRequest} from '../../middleware/requireAuth.js';

type QueryFn = typeof defaultQuery;

export const cloneRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeCloneSchema, req, res);
  if (!body.ok) {
    return;
  }

  const shareToken = body.data.shareToken ?? getShareTokenFromQuery(req);

  try {
    const recipe = await cloneRecipeForUser(
      getParam(req, 'id'),
      req.userId,
      shareToken,
      queryFn,
    );
    res
      .status(201)
      .json({...recipe, recipeId: recipe.id, versionId: recipe.versionId});
  } catch (error) {
    if (error instanceof RecipeNotFoundError) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }
    if (error instanceof RecipeAccessDeniedError) {
      res.status(403).json({error: 'Recipe access denied'});
      return;
    }
    throw error;
  }
};
