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
    (req, res) => {
      getEntitlement(req as EntitledRequest, res);
    },
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
  // Power-tier feature. Creation is gated, but listing and revocation stay
  // available to any authenticated owner: a downgraded user must still be
  // able to disable a compromised token.
  const power = [requireAuth, loadEntitlement(queryFn), requirePlan('power')];
  const authed = [requireAuth];
  router.post('/personal-access-tokens', ...power, (req, res) =>
    createToken(req as AuthedRequest, res, queryFn),
  );
  router.get('/personal-access-tokens', ...authed, (req, res) =>
    listTokens(req as AuthedRequest, res, queryFn),
  );
  router.delete('/personal-access-tokens/:id', ...authed, (req, res) =>
    revokeToken(req as AuthedRequest, res, queryFn),
  );

  return router;
};
