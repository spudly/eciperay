import {
  createAuthSessionLifecycle,
  createClearStoredSession,
  supabaseAuthStorageKeys,
  type AuthSessionStorage,
} from '@eciperay/client';

import {analytics, identifyAnalyticsUserIfConsented} from './analytics.js';
import {eciperay} from './api.js';
import {SUPABASE_URL} from './env.js';
import {supabase} from './supabase.js';

/**
 * Thin platform binding over the shared lifecycle in @eciperay/client:
 * web storage is localStorage, and the persisted-session clear is scoped
 * to this project's own Supabase keys (derived from the configured URL)
 * so another project's session on the same origin is never touched.
 */
export const authSessionStorage: AuthSessionStorage = {
  getAllKeys: async () => Object.keys(localStorage),
  getItem: async key => localStorage.getItem(key),
  removeMany: async keys => {
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  },
};

const clearStoredSession = createClearStoredSession(
  authSessionStorage,
  supabaseAuthStorageKeys(SUPABASE_URL),
);

export const {onAuthenticated, onSignedOut} = createAuthSessionLifecycle({
  supabase,
  api: eciperay,
  analytics,
  identify: identifyAnalyticsUserIfConsented,
  clearStoredSession,
});
