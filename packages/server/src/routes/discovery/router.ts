import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';

import {
  deleteFollowing,
  deleteHidden,
  deleteSaved,
  getDiscoveryFeed,
  listFollowing,
  listHidden,
  listSaved,
  postInterestSignal,
  putFollowing,
  putHidden,
  putSaved,
} from './discovery.js';

type QueryFn = typeof defaultQuery;

const a = (req: Parameters<typeof requireAuth>[0]) => req as AuthedRequest;

export const createDiscoveryRouter = (queryFn: QueryFn) => {
  const router = Router();
  router.get('/feed', requireAuth, (req, res) =>
    getDiscoveryFeed(a(req), res, queryFn),
  );
  router.get('/saved', requireAuth, (req, res) =>
    listSaved(a(req), res, queryFn),
  );
  router.put('/saved/:recipeId', requireAuth, (req, res) =>
    putSaved(a(req), res, queryFn),
  );
  router.delete('/saved/:recipeId', requireAuth, (req, res) =>
    deleteSaved(a(req), res, queryFn),
  );
  router.get('/hidden', requireAuth, (req, res) =>
    listHidden(a(req), res, queryFn),
  );
  router.put('/hidden/:recipeId', requireAuth, (req, res) =>
    putHidden(a(req), res, queryFn),
  );
  router.delete('/hidden/:recipeId', requireAuth, (req, res) =>
    deleteHidden(a(req), res, queryFn),
  );
  router.get('/following', requireAuth, (req, res) =>
    listFollowing(a(req), res, queryFn),
  );
  router.put('/following/:userId', requireAuth, (req, res) =>
    putFollowing(a(req), res, queryFn),
  );
  router.delete('/following/:userId', requireAuth, (req, res) =>
    deleteFollowing(a(req), res, queryFn),
  );
  router.post('/signals/:recipeId', requireAuth, (req, res) =>
    postInterestSignal(a(req), res, queryFn),
  );
  return router;
};
