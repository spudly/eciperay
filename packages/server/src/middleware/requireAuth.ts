import type {NextFunction, Request, Response} from 'express';

import {query as defaultQuery} from '../db/query.js';
import {
  extractBearerToken,
  getAuthUserFromRequest,
} from '../lib/getAuthUser.js';
import {upsertUserRecord} from '../lib/upsertUser.js';

export type AuthedRequest = Request & {
  userId: string;
  supabaseUid: string;
  userEmail: string;
};

type AppLocals = {query?: typeof defaultQuery; skipUserUpsert?: boolean};

const resolveQuery = (req: Request) => {
  const locals = req.app.locals as AppLocals;
  return locals.query ?? defaultQuery;
};

const shouldSkipUserUpsert = (req: Request) =>
  (req.app.locals as AppLocals).skipUserUpsert === true;

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({error: 'Missing authorization token'});
    return;
  }
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    res.status(401).json({error: 'Invalid or expired token'});
    return;
  }
  const authed = req as AuthedRequest;
  authed.supabaseUid = user.id;
  authed.userEmail = user.email ?? '';
  if (shouldSkipUserUpsert(req)) {
    authed.userId = authed.supabaseUid;
  } else {
    if (!authed.userEmail) {
      res.status(400).json({error: 'Authenticated user has no email'});
      return;
    }
    try {
      const result = await upsertUserRecord(
        {
          supabaseUid: authed.supabaseUid,
          email: authed.userEmail,
          displayName: null,
        },
        resolveQuery(req),
      );
      const row = result.rows[0] as {id: string} | undefined;
      if (!row) {
        next(new Error('Failed to resolve user record'));
        return;
      }
      authed.userId = row.id;
    } catch (error) {
      next(error);
      return;
    }
  }
  next();
};
