import type {User} from '@eciperay/types';

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-uuid-1',
  supabaseUid: 'supabase-uid-1',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});
