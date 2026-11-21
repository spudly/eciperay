import type {NextFunction, Request, Response} from 'express';

import {query as defaultQuery} from '../db/query.js';

import type {AuthedRequest} from './requireAuth.js';

type QueryFn = typeof defaultQuery;

export type AdminRequest = AuthedRequest & {isAdmin: boolean};

const IS_ADMIN_SQL = `select is_admin from users where id = $1`;

/**
 * 403s unless the authenticated user is an admin (#621, option B): admin is the
 * `users.is_admin` boolean, checked in the database on every call — never an
 * env allowlist or a client-side claim.
 *
 * Must run after requireAuth (programmer error otherwise), following the
 * loadEntitlement/requirePlan composition pattern.
 *
 * Usage: router.post('/', requireAuth, requireAdmin(queryFn), handler)
 */
export const requireAdmin =
  (queryFn: QueryFn) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const authed = req as Partial<AuthedRequest>;
    if (!authed.userId) {
      next(new Error('requireAdmin: requireAuth must run before requireAdmin'));
      return;
    }
    try {
      const result = await queryFn(IS_ADMIN_SQL, [authed.userId]);
      const row = result.rows[0] as {is_admin?: unknown} | undefined;
      if (row?.is_admin !== true) {
        res.status(403).json({error: 'Admin access required'});
        return;
      }
    } catch (error) {
      next(error);
      return;
    }
    (req as AdminRequest).isAdmin = true;
    next();
  };
