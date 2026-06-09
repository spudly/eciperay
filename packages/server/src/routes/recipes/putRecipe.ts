import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {
  RecipeNotFoundError,
  saveRecipeFromInput,
} from '../../lib/saveRecipeFromInput.js';
import {RecipeInputSchema, validate} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

export const putRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  try {
    const detail = await saveRecipeFromInput(
      {userId: req.userId, input: body.data, recipeId: getParam(req, 'id')},
      queryFn,
    );
    res.json(detail);
  } catch (error) {
    if (error instanceof RecipeNotFoundError) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }
    throw error;
  }
};
