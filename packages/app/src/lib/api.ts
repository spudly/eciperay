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
        const {data, error} = await supabase.auth.getSession();
        if (error) {
          // A failed session read (e.g. a transient refresh failure) is NOT a
          // signed-out state: the persisted session may still be valid.
          // Propagate the error so the request fails as an ordinary sync
          // failure instead of going out without a token — the server answers
          // a tokenless request with 401 'Missing authorization token', which
          // callers would mistake for a rejected credential and sign the user
          // out.
          throw error;
        }
        return data.session?.access_token ?? null;
      },
    });

export const eciperay = createEciperayClient(client);
