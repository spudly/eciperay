import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  loadEntitlement,
  type EntitledRequest,
} from '../../middleware/loadEntitlement.js';
import {requireAuth} from '../../middleware/requireAuth.js';

import {getNutrition} from './getNutrition.js';
import {getSubstitutions} from './getSubstitutions.js';

type QueryFn = typeof defaultQuery;

const e = (req: Parameters<typeof requireAuth>[0]) => req as EntitledRequest;

export const createAiRouter = (queryFn: QueryFn) => {
  const router = Router({mergeParams: true});
  router.get('/nutrition', requireAuth, loadEntitlement(queryFn), (req, res) =>
    getNutrition(e(req), res, queryFn),
  );
  router.get(
    '/substitutions',
    requireAuth,
    loadEntitlement(queryFn),
    (req, res) => getSubstitutions(e(req), res, queryFn),
  );
  return router;
};
