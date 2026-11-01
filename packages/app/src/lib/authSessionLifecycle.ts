import {identifyAnalyticsUser} from '@eciperay/client';
import type {Session} from '@supabase/supabase-js';

import {analytics} from './analytics';
import {api} from './api';
import {supabase} from './supabase';

export const onSignedOut = () => {
  analytics.reset();
};

/**
 * The server's requireAuth middleware rejects a stale bearer token with HTTP
 * 401 and this text as both the `error` code and the message (surfaced verbatim
 * by createApiClient). Any of the three signals is enough: the status is the
 * sturdiest, the code/message keep detection working for errors built before
 * `status` was attached.
 *
 * Detection is deliberately self-contained: on master `ApiError` carries only
 * `code` — the `status` field is added by PR #350 (the web twin of this fix,
 * #344), which has not merged yet. A local structural type lets this check
 * read `status` when the runtime error carries it without depending on that
 * type landing first.
 */
const INVALID_OR_EXPIRED_TOKEN_MESSAGE = 'Invalid or expired token';

type ApiErrorLike = Error & {code?: string; status?: number};

const isInvalidOrExpiredTokenError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const apiError = error as ApiErrorLike;
  return (
    apiError.status === 401 ||
    apiError.code === INVALID_OR_EXPIRED_TOKEN_MESSAGE ||
    apiError.message === INVALID_OR_EXPIRED_TOKEN_MESSAGE
  );
};

export const onAuthenticated = async (session: Session) => {
  try {
    await api.auth.syncUser();
  } catch (error) {
    if (!isInvalidOrExpiredTokenError(error)) {
      throw error;
    }
    // Token expiry is an expected lifecycle event, not an error: end in
    // the normal signed-out flow instead of surfacing an unhandled
    // rejection. Signing out clears the stored Supabase session, which
    // fires SIGNED_OUT — AuthProvider drops the session and runs
    // onSignedOut, and the navigation guards return to the signed-out UI.
    // (Supabase ignores the 401 its own logout call gets for an expired
    // token and still removes the local session.)
    try {
      await supabase.auth.signOut();
    } catch {
      onSignedOut();
    }
    return;
  }
  identifyAnalyticsUser(analytics, session);
};
