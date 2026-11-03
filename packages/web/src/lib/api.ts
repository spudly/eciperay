import {createApiClient, createEciperayClient} from '@eciperay/client';

import {API_BASE_URL} from './env.js';
import {supabase} from './supabase.js';

const api = createApiClient({
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

export const eciperay = createEciperayClient(api);
