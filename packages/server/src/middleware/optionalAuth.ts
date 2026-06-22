import type {NextFunction, Request, Response} from 'express';

import {query as defaultQuery} from '../db/query.js';
import {
  extractBearerToken,
  getAuthUserFromRequest,
} from '../lib/getAuthUser.js';
import {upsertUserRecord} from '../lib/upsertUser.js';

export type OptionalAuthedRequest = Request & {userId?: string};

type AppLocals = {query?: typeof defaultQuery; skipUserUpsert?: boolean};

const resolveQuery = (req: Request) => {
  const locals = req.app.locals as AppLocals;
  /* c8 ignore next -- createApp always sets app.locals.query in production and tests */
  return locals.query ?? defaultQuery;
};

const shouldSkipUserUpsert = (req: Request) =>
  (req.app.locals as AppLocals).skipUserUpsert === true;

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = extractBearerToken(req);
  if (!token) {
    next();
    return;
  }

  const user = await getAuthUserFromRequest(req);
  if (!user) {
    next();
    return;
  }

  const authed = req as OptionalAuthedRequest;

  if (shouldSkipUserUpsert(req)) {
    authed.userId = user.id;
    next();
    return;
  }

  if (!user.email) {
    next();
    return;
  }

  try {
    const result = await upsertUserRecord(
      {supabaseUid: user.id, email: user.email, displayName: null},
      resolveQuery(req),
    );
    const row = result.rows[0] as {id: string} | undefined;
    if (row) {
      authed.userId = row.id;
    }
  } catch (error) {
    next(error);
    return;
  }

  next();
};
