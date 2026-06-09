import {createClient} from '@supabase/supabase-js';

import {SUPABASE_ANON_KEY, SUPABASE_URL} from './env';

// In-memory storage adapter — avoids localStorage (unavailable in React Native)
// and removes the need for AsyncStorage native module.
const memoryStorage = new Map<string, string>();
const storage = {
  getItem: (key: string) => memoryStorage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStorage.set(key, value);
  },
  removeItem: (key: string) => {
    memoryStorage.delete(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
