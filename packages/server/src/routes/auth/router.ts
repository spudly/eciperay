import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';

import {syncUser} from './syncUser.js';

type QueryFn = typeof defaultQuery;

export const createAuthRouter = (queryFn: QueryFn) => {
  const router = Router();

  router.post('/sync', requireAuth, (req, res) =>
    syncUser(req as AuthedRequest, res, queryFn),
  );

  return router;
};
