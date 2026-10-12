import type {Response} from 'express';

import type {EntitledRequest} from '../../middleware/loadEntitlement.js';

/**
 * GET /api/account/entitlement — the single source of truth for all clients.
 * Driven by Paddle webhooks; evaluated lazily per request (no cron).
 */
export const getEntitlement = async (req: EntitledRequest, res: Response) => {
  res.json(req.entitlement);
};
