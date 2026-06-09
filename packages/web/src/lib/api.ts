import {createApiClient, createRecipooClient} from '@recipoo/client';

import {API_BASE_URL} from './env.js';
import {supabase} from './supabase.js';

const api = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: async () => {
    const {data} = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});

export const recipoo = createRecipooClient(api);
