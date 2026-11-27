import {
  createAuthSessionLifecycle,
  createClearStoredSession,
  identifyAnalyticsUser,
  type AuthSessionStorage,
} from '@eciperay/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Session} from '@supabase/supabase-js';

import {analytics} from './analytics';
import {eciperay} from './api';
import {supabase} from './supabase';

/**
 * Thin platform binding over the shared lifecycle in @eciperay/client:
 * app storage is AsyncStorage (private to the app, so the persisted-session
 * clear uses the shared pattern scan rather than project-scoped keys).
 */
export const authSessionStorage: AuthSessionStorage = {
  getAllKeys: () => AsyncStorage.getAllKeys(),
  getItem: (key: string) => AsyncStorage.getItem(key),
  removeMany: (keys: readonly string[]) => AsyncStorage.removeMany([...keys]),
};

const clearStoredSession = createClearStoredSession(authSessionStorage);

export const {onAuthenticated, onSignedOut} = createAuthSessionLifecycle({
  supabase,
  api: eciperay,
  analytics,
  identify: (session: Session) => {
    identifyAnalyticsUser(analytics, session);
  },
  clearStoredSession,
});
