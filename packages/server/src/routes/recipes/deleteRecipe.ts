import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';

import {deleteRecipeById} from './queries.js';

type QueryFn = typeof defaultQuery;

export const deleteRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await deleteRecipeById(
    getParam(req, 'id'),
    req.userId,
    queryFn,
  );
  if (result.rowCount === 0) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.status(204).send();
};
