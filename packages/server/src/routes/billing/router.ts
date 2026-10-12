import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  loadEntitlement,
  type EntitledRequest,
} from '../../middleware/loadEntitlement.js';
import {requireAuth} from '../../middleware/requireAuth.js';

import {paddleWebhook} from './paddleWebhook.js';
import {portalLink} from './portalLink.js';

type QueryFn = typeof defaultQuery;

export const createBillingRouter = (queryFn: QueryFn) => {
  const router = Router();

  // No auth — HMAC-SHA256 signature verification instead (see paddleWebhook).
  // Requires req.rawBody, stashed by the express.json verify callback.
  router.post('/paddle-webhook', (req, res) =>
    paddleWebhook(req, res, queryFn),
  );

  router.post('/portal-link', requireAuth, loadEntitlement(queryFn), (req, res) =>
    portalLink(req as EntitledRequest, res),
  );

  return router;
};
