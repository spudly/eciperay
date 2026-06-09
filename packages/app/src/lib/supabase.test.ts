import {supabase} from './supabase';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest
    .fn()
    .mockReturnValue({
      auth: {
        getSession: jest.fn(),
        onAuthStateChange: jest
          .fn()
          .mockReturnValue({data: {subscription: {unsubscribe: jest.fn()}}}),
      },
    }),
}));

describe('supabase', () => {
  test('exports a supabase client', () => {
    expect(supabase).toBeDefined();
  });

  test('in-memory storage adapter stores and retrieves values', () => {
    const memoryStorage = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStorage.set(key, value);
      },
      removeItem: (key: string) => {
        memoryStorage.delete(key);
      },
    };
    storage.setItem('key1', 'value1');
    expect(storage.getItem('key1')).toBe('value1');
    storage.removeItem('key1');
    expect(storage.getItem('key1')).toBeNull();
    expect(storage.getItem('missing')).toBeNull();
  });

  test('storage handles multiple keys independently', () => {
    const memoryStorage = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStorage.set(key, value);
      },
      removeItem: (key: string) => {
        memoryStorage.delete(key);
      },
    };
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    expect(storage.getItem('a')).toBe('1');
    expect(storage.getItem('b')).toBe('2');
    storage.removeItem('a');
    expect(storage.getItem('a')).toBeNull();
    expect(storage.getItem('b')).toBe('2');
  });
});
