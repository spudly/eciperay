import type {NextFunction, Request, Response} from 'express';
import type {Entitlement} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {resolveEntitlement} from '../lib/plans.js';

import type {AuthedRequest} from './requireAuth.js';

export type EntitledRequest = AuthedRequest & {entitlement: Entitlement};

type QueryFn = typeof defaultQuery;

/**
 * Resolves the user's billing entitlement and attaches it to the request.
 * Run AFTER requireAuth. Per-request lookup (never cached per-process) so
 * plan changes from Paddle webhooks take effect immediately.
 */
export const loadEntitlement =
  (queryFn: QueryFn = defaultQuery) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authed = req as AuthedRequest;
      (req as EntitledRequest).entitlement = await resolveEntitlement(
        authed.userId,
        queryFn,
      );
      next();
    } catch (error) {
      next(error);
    }
  };
