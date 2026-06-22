import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {optionalAuth} from '../../middleware/optionalAuth.js';

import {getPublicRecipe} from './getPublicRecipe.js';
import {listPublicRecipeComments} from './listPublicRecipeComments.js';
import {listPublicRecipes} from './listPublicRecipes.js';

type QueryFn = typeof defaultQuery;

export const createPublicRecipesRouter = (queryFn: QueryFn) => {
  const router = Router();
  router.get('/', (req, res) => listPublicRecipes(req, res, queryFn));
  router.get('/:id', optionalAuth, (req, res) =>
    getPublicRecipe(req, res, queryFn),
  );
  router.get('/:id/comments', optionalAuth, (req, res) =>
    listPublicRecipeComments(req, res, queryFn),
  );
  router.get('/:id/:slug', optionalAuth, (req, res) =>
    getPublicRecipe(req, res, queryFn),
  );
  return router;
};
