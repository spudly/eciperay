import AsyncStorage from '@react-native-async-storage/async-storage';
import {createSupabaseClient} from '@recipoo/client';

import {SUPABASE_ANON_KEY, SUPABASE_URL} from './env';

export const supabase = createSupabaseClient({
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  storage: AsyncStorage,
  persistSession: true,
});
