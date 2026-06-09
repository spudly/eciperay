describe('supabase', () => {
  test('creates client with localStorage and detectSessionInUrl', async () => {
    const createSupabaseClient = vi
      .fn()
      .mockReturnValue({auth: {getSession: vi.fn()}});
    vi.doMock('@recipoo/client', () => ({createSupabaseClient}));
    vi.doMock('./env.js', () => ({
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-key',
    }));
    vi.resetModules();
    await import('./supabase.js');
    expect(createSupabaseClient).toHaveBeenCalledWith({
      url: 'https://test.supabase.co',
      anonKey: 'test-key',
      storage: localStorage,
      detectSessionInUrl: true,
    });
  });
});
