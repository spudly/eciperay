import {createSupabaseClient} from './createSupabaseClient.js';

describe('createSupabaseClient', () => {
  test('returns a supabase client with auth', () => {
    const storage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    const client = createSupabaseClient({
      url: 'https://example.supabase.co',
      anonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.test',
      storage,
      persistSession: true,
      detectSessionInUrl: true,
    });
    expect(client.auth).toBeDefined();
  });

  test('uses default auth options when omitted', () => {
    const client = createSupabaseClient({
      url: 'https://example.supabase.co',
      anonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.test',
    });
    expect(client.auth).toBeDefined();
  });
});
