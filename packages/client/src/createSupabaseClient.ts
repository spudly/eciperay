import {createClient, type SupabaseClient} from '@supabase/supabase-js';

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
};

type AuthFlowType = 'implicit' | 'pkce';

type SupabaseClientOptions = {
  url: string;
  anonKey: string;
  storage?: StorageAdapter;
  persistSession?: boolean;
  detectSessionInUrl?: boolean;
  flowType?: AuthFlowType;
};

export const createSupabaseClient = (
  opts: SupabaseClientOptions,
): SupabaseClient =>
  // Supabase generic defaults differ from our explicit return type
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- createClient infers a wider auth schema than we expose
  createClient(opts.url, opts.anonKey, {
    auth: {
      storage: opts.storage,
      persistSession: opts.persistSession ?? true,
      detectSessionInUrl: opts.detectSessionInUrl ?? false,
      flowType: opts.flowType,
    },
  });
