import type {ApiError} from '@eciperay/client';
import type {Session} from '@supabase/supabase-js';

import {analytics, identifyAnalyticsUserIfConsented} from './analytics.js';
import {eciperay} from './api.js';
import {supabase} from './supabase.js';

export const onSignedOut = () => {
  analytics.reset();
};

/**
 * The server's requireAuth middleware rejects a stale bearer token with HTTP
 * 401 and this text as both the `error` code and the message (surfaced verbatim
 * by createApiClient). Any of the three signals is enough: the status is the
 * sturdiest, the code/message keep detection working for errors built before
 * `status` was attached.
 */
const INVALID_OR_EXPIRED_TOKEN_MESSAGE = 'Invalid or expired token';

const isInvalidOrExpiredTokenError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const apiError = error as ApiError;
  return (
    apiError.status === 401 ||
    apiError.code === INVALID_OR_EXPIRED_TOKEN_MESSAGE ||
    apiError.message === INVALID_OR_EXPIRED_TOKEN_MESSAGE
  );
};

export const onAuthenticated = async (session: Session) => {
  try {
    await eciperay.auth.syncUser();
  } catch (error) {
    if (!isInvalidOrExpiredTokenError(error)) {
      throw error;
    }
    // Token expiry is an expected lifecycle event, not an error: end in
    // the normal signed-out flow instead of surfacing an unhandled
    // rejection. Signing out clears the stored Supabase session, which
    // fires SIGNED_OUT — AuthProvider drops the session and runs
    // onSignedOut, and the route guards return to the signed-out UI.
    // (Supabase ignores the 401 its own logout call gets for an expired
    // token and still removes the local session.)
    try {
      await supabase.auth.signOut();
    } catch {
      onSignedOut();
    }
    return;
  }
  identifyAnalyticsUserIfConsented(session);
};
