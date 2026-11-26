import type {Session} from '@supabase/supabase-js';

import {AuthSessionRejectedError} from './AuthProvider.js';
import type {AnalyticsClient} from './createAnalytics.js';
import type {ApiError} from './createApiClient.js';

/**
 * The slice of the Supabase client the session lifecycle uses. Hosts pass
 * their full client; the narrow shape keeps the lifecycle testable without
 * a live Supabase project.
 */
export type AuthSessionSupabase = {
  auth: {
    getSession: () => Promise<{
      data: {session: Session | null};
      error: unknown;
    }>;
    signOut: (options: {scope: 'local'}) => Promise<{error: unknown}>;
  };
};

/**
 * Removes the persisted session ONLY if it still belongs to the rejected
 * session, returning true when the persisted state was the rejected
 * session's (keys removed, or nothing tying the storage to another
 * session) and false when a different session now owns the storage.
 * Build one with {@link createClearStoredSession}, or inject a platform
 * implementation directly.
 */
export type ClearStoredSession = (session: Session) => Promise<boolean>;

export type AuthSessionLifecycleBindings = {
  supabase: AuthSessionSupabase;
  api: {auth: {syncUser: () => Promise<unknown>}};
  analytics: Pick<AnalyticsClient, 'reset' | 'captureException' | 'log'>;
  identify: (session: Session) => void;
  clearStoredSession: ClearStoredSession;
};

export type AuthSessionLifecycle = {
  onAuthenticated: (session: Session) => Promise<void>;
  onSignedOut: () => void;
};

/**
 * The server's requireAuth middleware rejects a stale bearer token with HTTP
 * 401 and this text as both the `error` code and the message (surfaced verbatim
 * by createApiClient). Any of the three signals is enough: the status is the
 * sturdiest, the code/message keep detection working for errors built before
 * `status` was attached.
 */
const INVALID_OR_EXPIRED_TOKEN_MESSAGE = 'Invalid or expired token';

/**
 * When the stored session is already gone (e.g. a failed refresh cleared it),
 * api.ts's getToken returns null, the request goes out with no bearer token,
 * and requireAuth answers 401 with this text instead — the same dead-session
 * situation, so it belongs in the same signed-out recovery.
 */
const MISSING_AUTHORIZATION_TOKEN_MESSAGE = 'Missing authorization token';

/**
 * A network-level failure from createApiClient (typed `network_error` /
 * status 0), or a raw fetch TypeError if one ever slips through untyped:
 * the API was unreachable, which says nothing about the session's validity.
 */
const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const apiError = error as ApiError;
  return (
    apiError.code === 'network_error' ||
    apiError.status === 0 ||
    (error instanceof TypeError && error.message === 'Failed to fetch')
  );
};

const isInvalidOrExpiredTokenError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const apiError = error as ApiError;
  return (
    apiError.status === 401 ||
    apiError.code === INVALID_OR_EXPIRED_TOKEN_MESSAGE ||
    apiError.message === INVALID_OR_EXPIRED_TOKEN_MESSAGE ||
    apiError.code === MISSING_AUTHORIZATION_TOKEN_MESSAGE ||
    apiError.message === MISSING_AUTHORIZATION_TOKEN_MESSAGE
  );
};

const NETWORK_SYNC_RETRY_DELAY_MS = 1000;

/**
 * The auth session lifecycle both hosts run from their AuthProvider: sync
 * the signed-in user with the API, identify them to analytics, and — when
 * the API rejects the session's token — end the session in the normal
 * signed-out flow instead of surfacing an unhandled rejection.
 *
 * One implementation lives here so a fix lands for both hosts at once; the
 * hosts inject only what is genuinely platform-specific (their Supabase
 * client, API client, analytics identity rule, and persisted-session
 * storage clear).
 */
export const createAuthSessionLifecycle = (
  bindings: AuthSessionLifecycleBindings,
): AuthSessionLifecycle => {
  const {supabase, api, analytics, identify, clearStoredSession} = bindings;

  const onSignedOut = () => {
    analytics.reset();
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
  const isStaleSessionFailure = async (
    session: Session,
  ): Promise<boolean> => {
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
    // A clear that itself fails (storage unavailable) still counts as
    // cleared: nothing more can be removed locally, and the sign-out
    // failure below must be surfaced either way.
    let clearedOwnSession = true;
    try {
      clearedOwnSession = await clearStoredSession(session);
    } catch {
      clearedOwnSession = true;
    }
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

  const onAuthenticated = async (session: Session) => {
    let retriedSync = false;
    for (let attempt = 0; ; attempt++) {
      try {
        await api.auth.syncUser();
      } catch (error) {
        if (isNetworkError(error) && attempt === 0) {
          // Transient network failure (#344): a single blip during /auth/sync
          // was still reported to PostHog as an exception on the first failure
          // (2026-11-17 production recurrence), even though the session is
          // valid. Retry once after a short delay before reporting anything.
          await new Promise(resolve =>
            setTimeout(resolve, NETWORK_SYNC_RETRY_DELAY_MS),
          );
          if (await isStaleSessionFailure(session)) {
            // A newer session signed in during the delay: its own lifecycle
            // call owns the sync — do not retry (or later identify) for this
            // superseded session.
            return;
          }
          retriedSync = true;
          continue;
        }
        if (isNetworkError(error)) {
          // Network-level failure (#378), still failing after the retry: the
          // API is unreachable, which says nothing about the session's
          // validity. The sync is retried by the next auth event, so record
          // this as a handled analytics message — not an exception — and
          // resolve. No sign-out, no cleanup.
          analytics.log(
            'warn',
            'auth sync failed after one retry: network error',
            {error: error instanceof Error ? error.message : String(error)},
          );
          return;
        }
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
      break;
    }
    if (retriedSync && (await isStaleSessionFailure(session))) {
      // The retry succeeded, but a newer session took over while it was in
      // flight: identifying this superseded session would overwrite the newer
      // session's analytics identity.
      return;
    }
    identify(session);
  };

  return {onAuthenticated, onSignedOut};
};

/**
 * The async storage surface {@link createClearStoredSession} needs. Web
 * binds an adapter over `localStorage`; the app binds one over
 * AsyncStorage.
 */
export type AuthSessionStorage = {
  getAllKeys: () => Promise<readonly string[]>;
  getItem: (key: string) => Promise<string | null>;
  removeMany: (keys: readonly string[]) => Promise<void>;
};

/**
 * Supabase persists the session in storage under `sb-<project>-auth-token`
 * (plus a `-user` companion key). When signOut itself fails before removing
 * the session (e.g. the storage removal rejects), removing those keys
 * directly is the last resort that keeps a reload from resurrecting the
 * dead session.
 */
const SUPABASE_AUTH_STORAGE_KEY = /^sb-.+-auth-token(-user)?$/;
const SUPABASE_AUTH_MAIN_KEY = /^sb-.+-auth-token$/;

/**
 * This client's own Supabase storage keys. supabase-js derives its default
 * storage key from the client URL — `sb-<hostname's first label>-auth-token`,
 * plus a `-user` companion — so the fallback clear is scoped to exactly those
 * two keys: scanning every `sb-*-auth-token` key could delete (or be confused
 * by) another Supabase project's session stored on the same origin. Returns
 * null when the configured URL cannot produce a key, in which case the
 * caller falls back to the pattern scan.
 */
export const supabaseAuthStorageKeys = (
  supabaseUrl: string,
): string[] | null => {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
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
 * Builds the persisted-session clear both hosts inject into the lifecycle.
 * When `ownStorageKeys` are given (web, derived from the configured
 * Supabase URL via {@link supabaseAuthStorageKeys}), the clear is scoped to
 * exactly those keys; without them it falls back to scanning storage for
 * the Supabase auth-token pattern (the app, whose storage is private to
 * the app).
 *
 * The clear is identity-aware: it removes the persisted session ONLY if it
 * still belongs to the rejected session. A concurrent sign-in or refresh
 * can persist a replacement session while the recovery sign-out is
 * pending; deleting the shared storage keys then would destroy that newer
 * session for the next reload even though AuthProvider preserves it in
 * memory. The identity is confirmed immediately before removal — storage
 * offers no compare-and-swap, so a value that changed since the identity
 * read is the last observable chance to spare a replacement session.
 */
export const createClearStoredSession = (
  storage: AuthSessionStorage,
  ownStorageKeys?: readonly string[] | null,
): ClearStoredSession => {
  return async (session: Session): Promise<boolean> => {
    try {
      const ownKeys = ownStorageKeys ?? null;
      const keys = ownKeys
        ? (
            await Promise.all(
              ownKeys.map(async key =>
                (await storage.getItem(key)) !== null ? key : null,
              ),
            )
          ).filter((key): key is string => key !== null)
        : (await storage.getAllKeys()).filter(key =>
            SUPABASE_AUTH_STORAGE_KEY.test(key),
          );
      const mainKey = ownKeys
        ? ownKeys[0]
        : keys.find(key => SUPABASE_AUTH_MAIN_KEY.test(key));
      let identityBaseline: string | null = null;
      if (mainKey) {
        const stored = await storage.getItem(mainKey);
        if (stored) {
          identityBaseline = stored;
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
      if (keys.length > 0) {
        if (identityBaseline !== null && mainKey) {
          // Confirm the identity immediately before removal: a value that
          // changed since the identity read is a replacement session
          // persisted in between, and its keys must be spared.
          const confirmed = await storage.getItem(mainKey);
          if (confirmed !== identityBaseline) {
            return false;
          }
        }
        await storage.removeMany(keys);
      }
      return true;
    } catch {
      // Storage unavailable (private mode / quota): nothing more can be
      // cleared locally; the caller still surfaces the sign-out failure and
      // runs the signed-out cleanup.
      return true;
    }
  };
};
