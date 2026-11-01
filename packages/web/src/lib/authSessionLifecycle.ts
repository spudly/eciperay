import {AuthSessionRejectedError, type ApiError} from '@eciperay/client';
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

/**
 * True when the session this lifecycle call was started for is no longer the
 * stored session: AuthProvider starts a fresh onAuthenticated for every auth
 * event, so calls overlap — a refresh can install a newer, valid session while
 * an older token's sync is still in flight. A 401 belonging to the old token
 * must not sign the newer session out. Returns false when the stored session
 * still carries this call's token (or cannot be read, in which case the failure
 * cannot be shown to be stale and is handled as current).
 */
const isStaleSessionFailure = async (session: Session): Promise<boolean> => {
  try {
    const {data} = await supabase.auth.getSession();
    if (!data.session) {
      // Already signed out (or never persisted): nothing left to sign out.
      return true;
    }
    return data.session.access_token !== session.access_token;
  } catch {
    return false;
  }
};

/**
 * Supabase persists the session in web storage under `sb-<project>-auth-token`
 * (plus a `-user` companion key). When signOut itself fails before removing the
 * session (e.g. the storage removal rejects), removing those keys directly is
 * the last resort that keeps a reload from resurrecting the dead session.
 */
const SUPABASE_AUTH_STORAGE_KEY = /^sb-.+-auth-token(-user)?$/;

const clearPersistedSupabaseSession = () => {
  try {
    for (const key of Object.keys(localStorage)) {
      if (SUPABASE_AUTH_STORAGE_KEY.test(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage unavailable (private mode / quota): nothing more can be
    // cleared locally; the caller still surfaces the sign-out failure.
  }
};

/**
 * Ends the current session after its token was rejected. Local scope only: the
 * rejection proves this session's token is dead (and the server can map a
 * transient getUser failure to the same 401), so it must never revoke the
 * user's sessions on other devices.
 *
 * A failed sign-out — a returned `{error}` or a thrown exception, treated
 * identically — is NOT a completed recovery: onSignedOut() alone cannot replace
 * the SIGNED_OUT event AuthProvider never received. Recovery force-clears the
 * persisted session, runs the signed-out cleanup, and then throws an
 * AuthSessionRejectedError so the failure is surfaced instead of resolving as
 * though the signed-out flow had been entered. The tag is the signal
 * AuthProvider uses to drop its in-memory session: it drops the session ONLY
 * for this tagged recovery failure, never for an ordinary sync failure, whose
 * session is still valid.
 */
const signOutAfterTokenRejection = async (): Promise<void> => {
  let signOutFailure: unknown = null;
  try {
    const {error} = await supabase.auth.signOut({scope: 'local'});
    if (error) {
      signOutFailure = error;
    }
  } catch (error) {
    signOutFailure = error;
  }
  if (!signOutFailure) {
    return;
  }
  clearPersistedSupabaseSession();
  onSignedOut();
  throw new AuthSessionRejectedError(
    signOutFailure instanceof Error
      ? signOutFailure.message
      : 'Sign-out failed after the session token was rejected',
    {cause: signOutFailure},
  );
};

export const onAuthenticated = async (session: Session) => {
  try {
    await eciperay.auth.syncUser();
  } catch (error) {
    if (!isInvalidOrExpiredTokenError(error)) {
      // Ordinary sync failure (e.g. a transient 503 while the auth service
      // is unavailable): the session's token was not rejected and the
      // provider session is still valid. Report the failure and rethrow it
      // untagged — AuthProvider preserves the session for untagged
      // rejections and runs no signed-out cleanup.
      analytics.captureException(error);
      throw error;
    }
    if (await isStaleSessionFailure(session)) {
      // The 401 belongs to a superseded token; the current session is a
      // different (newer) one whose own lifecycle call handles it. Ignore
      // the obsolete failure instead of signing the new session out.
      return;
    }
    // Token expiry is an expected lifecycle event, not an error: end in
    // the normal signed-out flow instead of surfacing an unhandled
    // rejection. Signing out clears the stored Supabase session, which
    // fires SIGNED_OUT — AuthProvider drops the session and runs
    // onSignedOut, and the route guards return to the signed-out UI.
    // (Supabase ignores the 401 its own logout call gets for an expired
    // token and still removes the local session.)
    await signOutAfterTokenRejection();
    return;
  }
  identifyAnalyticsUserIfConsented(session);
};
