import {AuthSessionRejectedError, type ApiError} from '@eciperay/client';
import type {Session} from '@supabase/supabase-js';

import {analytics, identifyAnalyticsUserIfConsented} from './analytics.js';
import {eciperay} from './api.js';
import {SUPABASE_URL} from './env.js';
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
  // A read that fails — getSession throwing, or returning an error
  // alongside a null session (e.g. a failed refresh, which does not remove
  // the persisted session) — proves nothing about staleness: a returned
  // error must not be read as "already signed out", or recovery is skipped
  // and the rejected session survives. Retry the read once (a transient
  // storage/refresh failure often clears, and a successful retry can still
  // spare a newer session); only if the retry also fails is the failure
  // handled as current, per the contract above.
  const readStoredSession = async (): Promise<Session | null> => {
    const {data, error} = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return data.session;
  };
  let storedSession: Session | null;
  try {
    storedSession = await readStoredSession();
  } catch {
    try {
      storedSession = await readStoredSession();
    } catch {
      return false;
    }
  }
  if (!storedSession) {
    // Already signed out (or never persisted): nothing left to sign out.
    return true;
  }
  return storedSession.access_token !== session.access_token;
};

/**
 * Supabase persists the session in web storage under `sb-<project>-auth-token`
 * (plus a `-user` companion key). When signOut itself fails before removing the
 * session (e.g. the storage removal rejects), removing those keys directly is
 * the last resort that keeps a reload from resurrecting the dead session.
 */
const SUPABASE_AUTH_STORAGE_KEY = /^sb-.+-auth-token(-user)?$/;

/**
 * This client's own Supabase storage keys. supabase-js derives its default
 * storage key from the client URL — `sb-<hostname's first label>-auth-token`,
 * plus a `-user` companion — so the fallback clear is scoped to exactly those
 * two keys: scanning every `sb-*-auth-token` key on the origin could delete
 * (or be confused by) another Supabase project's session stored on the same
 * origin. Returns null when the configured URL cannot produce a key, in
 * which case the caller falls back to the pattern scan.
 */
const ownSupabaseAuthStorageKeys = (): string[] | null => {
  try {
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
    if (!projectRef) {
      return null;
    }
    const mainKey = `sb-${projectRef}-auth-token`;
    return [mainKey, `${mainKey}-user`];
  } catch {
    return null;
  }
};

/**
 * Removes the persisted session ONLY if it still belongs to the rejected
 * session. A concurrent sign-in or refresh can persist a replacement session
 * while the recovery sign-out is pending; deleting the shared storage keys
 * then would destroy that newer session for the next reload even though
 * AuthProvider preserves it in memory. Returns true when the persisted state
 * was the rejected session's (keys removed, or nothing parseable tying the
 * storage to another session), false when a different session now owns the
 * storage — in which case its keys and the signed-out cleanup are both
 * skipped. localStorage is synchronous, so the identity read and the removal
 * cannot interleave.
 */
const clearPersistedSupabaseSession = (session: Session): boolean => {
  try {
    const ownKeys = ownSupabaseAuthStorageKeys();
    const keys = ownKeys
      ? ownKeys.filter(key => localStorage.getItem(key) !== null)
      : Object.keys(localStorage).filter(key =>
          SUPABASE_AUTH_STORAGE_KEY.test(key),
        );
    const mainKey = ownKeys
      ? ownKeys[0]
      : keys.find(key => !key.endsWith('-user'));
    if (mainKey) {
      const stored = localStorage.getItem(mainKey);
      if (stored) {
        try {
          const parsed: unknown = JSON.parse(stored);
          const storedToken =
            parsed !== null &&
            typeof parsed === 'object' &&
            'access_token' in parsed
              ? (parsed as {access_token?: unknown}).access_token
              : undefined;
          if (
            typeof storedToken === 'string' &&
            storedToken !== session.access_token
          ) {
            return false;
          }
        } catch {
          // Unparseable stored value: it cannot belong to a working newer
          // session, so it is safe to remove.
        }
      }
    }
    for (const key of keys) {
      localStorage.removeItem(key);
    }
    return true;
  } catch {
    // Storage unavailable (private mode / quota): nothing more can be
    // cleared locally; the caller still surfaces the sign-out failure and
    // runs the signed-out cleanup.
    return true;
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
 * persisted session (identity-aware: a replacement session persisted by a
 * concurrent sign-in or refresh is left untouched, and the signed-out cleanup
 * is skipped with it), runs the signed-out cleanup, and then throws an
 * AuthSessionRejectedError so the failure is surfaced instead of resolving as
 * though the signed-out flow had been entered. The tag is the signal
 * AuthProvider uses to drop its in-memory session: it drops the session ONLY
 * for this tagged recovery failure, never for an ordinary sync failure, whose
 * session is still valid.
 */
const signOutAfterTokenRejection = async (
  session: Session,
): Promise<void> => {
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
  const clearedOwnSession = clearPersistedSupabaseSession(session);
  // AuthProvider consumes the tagged error silently (it only drops the
  // session), so report the sign-out failure here — before the analytics
  // reset, while the failing session's identity is still attached — to keep
  // a failed recovery visible in error tracking. Normal token expiry (a
  // successful sign-out) stays quiet.
  analytics.captureException(signOutFailure);
  if (clearedOwnSession) {
    onSignedOut();
  }
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
    await signOutAfterTokenRejection(session);
    return;
  }
  identifyAnalyticsUserIfConsented(session);
};
