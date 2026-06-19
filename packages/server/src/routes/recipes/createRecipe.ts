import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {saveNewRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
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
  const {recipeId, versionId, recipe} = await saveNewRecipeFromInput(
    {userId: req.userId, input: body.data, createdVia: 'manual'},
    queryFn,
  );
  res.status(201).json({...recipe, recipeId, versionId});
};
