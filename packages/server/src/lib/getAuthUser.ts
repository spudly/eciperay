import type {Request} from 'express';
import type {User} from '@supabase/supabase-js';

import {supabase} from '../supabase.js';

export const extractBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

/**
 * The three ways a bearer-token lookup can end. `invalid` means the credential
 * itself was rejected (or is absent) — callers answer 401. `unavailable` means
 * the lookup failed transiently (Supabase auth outage, network failure, 5xx):
 * the credential may well be valid, so callers must NOT treat it as a rejected
 * token — requireAuth answers 503, which clients rethrow instead of signing the
 * user out.
 */
export type AuthUserLookup =
  | {status: 'authenticated'; user: User}
  | {status: 'invalid'}
  | {status: 'unavailable'};

/**
 * Supabase reports a rejected credential with an HTTP 401/403 on the getUser
 * error. One exception to the status rule: when the auth server answers
 * `session_not_found` (the JWT's session row is gone — signed out, deleted,
 * or terminated), auth-js converts it to an `AuthSessionMissingError` with
 * status 400, so the error name must be checked before the status fallback.
 * Anything else — a 5xx, or a retryable fetch failure with no meaningful
 * status — is a transient lookup failure.
 */
const isCredentialRejection = (error: {
  status?: number;
  name?: string;
}): boolean =>
  error.name === 'AuthSessionMissingError' ||
  error.status === 401 ||
  error.status === 403;

export const lookupAuthUserFromRequest = async (
  req: Request,
): Promise<AuthUserLookup> => {
  const token = extractBearerToken(req);
  if (!token) {
    return {status: 'invalid'};
  }
  let data: {user: User | null};
  let error: {status?: number; name?: string} | null;
  try {
    const result = await supabase.auth.getUser(token);
    data = result.data;
    error = result.error;
  } catch {
    return {status: 'unavailable'};
  }
  if (!error && data.user) {
    return {status: 'authenticated', user: data.user};
  }
  if (error && isCredentialRejection(error)) {
    return {status: 'invalid'};
  }
  return {status: 'unavailable'};
};

export const getAuthUserFromRequest = async (
  req: Request,
): Promise<User | null> => {
  const lookup = await lookupAuthUserFromRequest(req);
  return lookup.status === 'authenticated' ? lookup.user : null;
};
