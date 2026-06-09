import '@testing-library/jest-dom/vitest';
import {cleanup} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, vi} from 'vitest';

import {server} from './msw/server.js';

vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

const mockSession = {
  access_token: 'test-token',
  user: {id: 'user-1', email: 'test@example.com'},
};

const mockAuth = {
  getSession: vi.fn().mockResolvedValue({data: {session: mockSession}}),
  signInWithPassword: vi.fn().mockResolvedValue({error: null}),
  signUp: vi
    .fn()
    .mockResolvedValue({data: {session: mockSession}, error: null}),
  signOut: vi.fn().mockResolvedValue({error: null}),
  resetPasswordForEmail: vi.fn().mockResolvedValue({error: null}),
  updateUser: vi.fn().mockResolvedValue({error: null}),
  onAuthStateChange: vi
    .fn()
    .mockReturnValue({data: {subscription: {unsubscribe: vi.fn()}}}),
};

vi.mock('../lib/supabase.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/supabase.js')>();
  return {...actual, supabase: {auth: mockAuth}};
});

beforeAll(() => {
  server.listen({onUnhandledRequest: 'error'});
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
