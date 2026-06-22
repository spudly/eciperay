import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';

import {deleteAccount} from './deleteAccount.js';
import {exportAccount} from './exportAccount.js';

type QueryFn = typeof defaultQuery;

export const createAccountRouter = (queryFn: QueryFn) => {
  const router = Router();

  router.get('/export', requireAuth, (req, res) =>
    exportAccount(req as AuthedRequest, res, queryFn),
  );
  router.delete('/', requireAuth, (req, res) =>
    deleteAccount(req as AuthedRequest, res, queryFn),
  );

  return router;
};
