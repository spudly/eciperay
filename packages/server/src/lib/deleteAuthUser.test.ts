import {jest} from '@jest/globals';

const mockDeleteUser =
  jest.fn<() => Promise<{error: {message: string} | null}>>();

jest.unstable_mockModule('../supabase.js', () => ({
  supabase: {auth: {admin: {deleteUser: mockDeleteUser}}},
}));

const {deleteAuthUser} = await import('./deleteAuthUser.js');

describe('deleteAuthUser', () => {
  beforeEach(() => {
    mockDeleteUser.mockReset();
  });

  test('deletes the auth user', async () => {
    mockDeleteUser.mockResolvedValue({error: null});
    await deleteAuthUser('supabase-uid-1');
    expect(mockDeleteUser).toHaveBeenCalledWith('supabase-uid-1');
  });

  test('throws when Supabase returns an error', async () => {
    mockDeleteUser.mockResolvedValue({error: {message: 'Delete failed'}});
    await expect(deleteAuthUser('supabase-uid-1')).rejects.toThrow(
      'Delete failed',
    );
  });
});
