import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {
  isRecipeEditable,
  recipeEditBlockedError,
} from '../../lib/assertRecipeEditable.js';
import {fetchRecipeDetail} from '../../lib/recipeQueries.js';
import {getParam} from '../../lib/getParam.js';

import {setLineageStatus} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

export const acceptImport = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const recipe = await fetchRecipeDetail(recipeId, req.userId, queryFn);
  if (!recipe) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  if (!isRecipeEditable(recipe.status)) {
    res.status(409).json({error: recipeEditBlockedError()});
    return;
  }
  if (recipe.status === 'idea') {
    await setLineageStatus(recipeId, req.userId, 'evolving', queryFn);
  }
  const refreshed = await fetchRecipeDetail(recipeId, req.userId, queryFn);
  if (!refreshed) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json(refreshed);
};
