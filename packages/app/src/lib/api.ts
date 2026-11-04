import {createApiClient, createEciperayClient} from '@eciperay/client';

import {createFixtureApiClient} from './e2eFixtures';
import {API_BASE_URL, E2E_FIXTURE_MODE} from './env';
import {supabase} from './supabase';

// In the emulator use-case build (#183 Phase 2) every API call is
// answered from the fixture data in e2eFixtures instead of the network,
// so the suite is self-contained: no production backend, no account.
const client = E2E_FIXTURE_MODE
  ? createFixtureApiClient()
  : createApiClient({
      baseUrl: API_BASE_URL,
      getToken: async () => {
        const {data} = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      },
    });

export const api = createEciperayClient(client);
