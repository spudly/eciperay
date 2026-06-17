import {createSupabaseClient} from '@eciperay/client';

import {SUPABASE_ANON_KEY, SUPABASE_URL} from './env.js';

export const supabase = createSupabaseClient({
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  storage: localStorage,
  detectSessionInUrl: true,
});
