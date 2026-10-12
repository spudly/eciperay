import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';

import {deleteAccount} from './deleteAccount.js';
import {
  createToken,
  listTokens,
  revokeToken,
} from './personalAccessTokens.js';
import {exportAccount} from './exportAccount.js';
import {getNutritionGoals, putNutritionGoals} from './nutritionGoals.js';

type QueryFn = typeof defaultQuery;

export const createAccountRouter = (queryFn: QueryFn) => {
  const router = Router();

  router.get('/export', requireAuth, (req, res) =>
    exportAccount(req as AuthedRequest, res, queryFn),
  );
  router.get('/nutrition-goals', requireAuth, (req, res) =>
    getNutritionGoals(req as AuthedRequest, res, queryFn),
  );
  router.put('/nutrition-goals', requireAuth, (req, res) =>
    putNutritionGoals(req as AuthedRequest, res, queryFn),
  );
  router.delete('/', requireAuth, (req, res) =>
    deleteAccount(req as AuthedRequest, res, queryFn),
  );
  router.post('/personal-access-tokens', requireAuth, (req, res) =>
    createToken(req as AuthedRequest, res, queryFn),
  );
  router.get('/personal-access-tokens', requireAuth, (req, res) =>
    listTokens(req as AuthedRequest, res, queryFn),
  );
  router.delete('/personal-access-tokens/:id', requireAuth, (req, res) =>
    revokeToken(req as AuthedRequest, res, queryFn),
  );

  return router;
};
