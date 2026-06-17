import {createApiClient, createEciperayClient} from '@eciperay/client';

import {API_BASE_URL} from './env';
import {supabase} from './supabase';

const client = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: async () => {
    const {data} = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});

export const api = createEciperayClient(client);
