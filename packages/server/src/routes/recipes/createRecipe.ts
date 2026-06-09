import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {saveRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {RecipeInputSchema, validate} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

export const createRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const detail = await saveRecipeFromInput(
    {userId: req.userId, input: body.data},
    queryFn,
  );
  res.status(201).json(detail);
};
