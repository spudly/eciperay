import AsyncStorage from '@react-native-async-storage/async-storage';
import {createSupabaseClient} from '@eciperay/client';
import type {SupabaseClient} from '@supabase/supabase-js';

import {createFixtureSupabaseClient} from './e2eFixtures';
import {E2E_FIXTURE_MODE, SUPABASE_ANON_KEY, SUPABASE_URL} from './env';

// In the emulator use-case build (#183 Phase 2) the client is the
// fixture stub from e2eFixtures: it reports a permanent fixture session
// so the app boots signed in with no backend and no real account. The
// flag is baked at bundle time and only the emulator CI job sets it.
export const supabase: SupabaseClient = E2E_FIXTURE_MODE
  ? createFixtureSupabaseClient()
  : createSupabaseClient({
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
      storage: AsyncStorage,
      persistSession: true,
      flowType: 'pkce',
    });
