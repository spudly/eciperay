import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  loadEntitlement,
  type EntitledRequest,
} from '../../middleware/loadEntitlement.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';
import {requirePlan} from '../../middleware/requirePlan.js';

import {deleteAccount} from './deleteAccount.js';
import {createToken, listTokens, revokeToken} from './personalAccessTokens.js';
import {exportAccount} from './exportAccount.js';
import {getEntitlement} from './getEntitlement.js';
import {getNutritionGoals, putNutritionGoals} from './nutritionGoals.js';

type QueryFn = typeof defaultQuery;

export const createAccountRouter = (queryFn: QueryFn) => {
  const router = Router();

  router.get(
    '/entitlement',
    requireAuth,
    loadEntitlement(queryFn),
    (req, res) => getEntitlement(req as EntitledRequest, res),
  );
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
  // Personal access tokens (and the MCP API surface they unlock) are a
  // Power-tier feature.
  const power = [requireAuth, loadEntitlement(queryFn), requirePlan('power')];
  router.post('/personal-access-tokens', ...power, (req, res) =>
    createToken(req as AuthedRequest, res, queryFn),
  );
  router.get('/personal-access-tokens', ...power, (req, res) =>
    listTokens(req as AuthedRequest, res, queryFn),
  );
  router.delete('/personal-access-tokens/:id', ...power, (req, res) =>
    revokeToken(req as AuthedRequest, res, queryFn),
  );

  return router;
};
