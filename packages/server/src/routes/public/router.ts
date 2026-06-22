import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';

import {getPublicRecipe} from './getPublicRecipe.js';

type QueryFn = typeof defaultQuery;

export const createPublicRecipesRouter = (queryFn: QueryFn) => {
  const router = Router();
  router.get('/:id', (req, res) => getPublicRecipe(req, res, queryFn));
  router.get('/:id/:slug', (req, res) => getPublicRecipe(req, res, queryFn));
  return router;
};
