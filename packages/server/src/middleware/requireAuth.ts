import type {NextFunction, Request, Response} from 'express';

import {query as defaultQuery} from '../db/query.js';
import {
  extractBearerToken,
  lookupAuthUserFromRequest,
} from '../lib/getAuthUser.js';
import {
  PERSONAL_ACCESS_TOKEN_PREFIX,
  resolveUserByPersonalAccessToken,
} from '../lib/personalAccessTokens.js';
import {upsertUserRecord} from '../lib/upsertUser.js';

export type AuthedRequest = Request & {
  userId: string;
  supabaseUid: string;
  userEmail: string;
};

type AppLocals = {query?: typeof defaultQuery; skipUserUpsert?: boolean};

const resolveQuery = (req: Request) => {
  const locals = req.app.locals as AppLocals;
  /* c8 ignore next -- createApp always sets app.locals.query in production and tests */
  return locals.query ?? defaultQuery;
};

const shouldSkipUserUpsert = (req: Request) =>
  (req.app.locals as AppLocals).skipUserUpsert === true;

const authenticateWithPersonalAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
  token: string,
) => {
  const user = await resolveUserByPersonalAccessToken(token, resolveQuery(req));
  if (!user) {
    res.status(401).json({error: 'Invalid or revoked token'});
    return;
  }
  const authed = req as AuthedRequest;
  authed.userId = user.id;
  authed.supabaseUid = user.supabaseUid;
  authed.userEmail = user.email;
  next();
};

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
  if (token.startsWith(PERSONAL_ACCESS_TOKEN_PREFIX)) {
    await authenticateWithPersonalAccessToken(req, res, next, token);
    return;
  }
  const lookup = await lookupAuthUserFromRequest(req);
  if (lookup.status === 'unavailable') {
    // A transient Supabase auth failure is not a rejected token: a 503
    // keeps clients from signing the user out over a temporary outage
    // (they only treat 401 as a token rejection).
    res.status(503).json({error: 'Authentication service unavailable'});
    return;
  }
  if (lookup.status === 'invalid') {
    res.status(401).json({error: 'Invalid or expired token'});
    return;
  }
  const user = lookup.user;
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
