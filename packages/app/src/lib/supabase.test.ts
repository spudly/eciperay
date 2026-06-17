import AsyncStorage from '@react-native-async-storage/async-storage';

const mockCreateSupabaseClient = jest.fn((opts: unknown) => {
  void opts;
  return {auth: {}};
});

jest.mock('@eciperay/client', () => ({
  createSupabaseClient: (opts: unknown) => mockCreateSupabaseClient(opts),
}));

jest.mock('./env', () => ({
  SUPABASE_URL: 'http://localhost',
  SUPABASE_ANON_KEY: 'test-anon-key',
}));

describe('supabase', () => {
  test('creates client with AsyncStorage and persistSession', () => {
    jest.isolateModules(() => {
      const {supabase} = require('./supabase') as {supabase: {auth: object}};
      expect(supabase).toBeDefined();
    });
    expect(mockCreateSupabaseClient).toHaveBeenCalledWith({
      url: 'http://localhost',
      anonKey: 'test-anon-key',
      storage: AsyncStorage,
      persistSession: true,
    });
  });
});
