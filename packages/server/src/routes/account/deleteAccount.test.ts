import {jest} from '@jest/globals';
import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockDeleteAuthUser = jest.fn<() => Promise<void>>();

jest.unstable_mockModule('../../lib/deleteAuthUser.js', () => ({
  deleteAuthUser: mockDeleteAuthUser,
}));

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('DELETE /account', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockDeleteAuthUser.mockReset();
    mockDeleteAuthUser.mockResolvedValue();
  });

  test('deletes the user and auth account', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce({...makeQueryResult([{}]), rowCount: 1});

    const res = await request(getApp())
      .delete('/api/account')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(204);
    expect(mockDeleteAuthUser).toHaveBeenCalledWith('user-uuid-1');
  });

  test('returns 404 when the user record is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});

    const res = await request(getApp())
      .delete('/api/account')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
    expect(mockDeleteAuthUser).not.toHaveBeenCalled();
  });

  test('returns 502 when auth deletion fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce({...makeQueryResult([{}]), rowCount: 1});
    mockDeleteAuthUser.mockRejectedValueOnce(new Error('Auth delete failed'));

    const res = await request(getApp())
      .delete('/api/account')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({error: 'Auth delete failed'});
  });

  test('returns a generic auth deletion error for non-Error failures', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce({...makeQueryResult([{}]), rowCount: 1});
    mockDeleteAuthUser.mockRejectedValueOnce('nope');

    const res = await request(getApp())
      .delete('/api/account')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      error: 'Failed to delete authentication account',
    });
  });

  test('returns 401 without authorization', async () => {
    const res = await request(getApp()).delete('/api/account');
    expect(res.status).toBe(401);
  });
});
