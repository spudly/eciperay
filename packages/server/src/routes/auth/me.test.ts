import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});
const AUTH = 'Bearer <redacted>';

const ME_ROW = {
  id: 'user-uuid-1',
  supabase_uid: 'supabase-uid-1',
  email: 'test@example.com',
  display_name: 'Test User',
  is_admin: true,
  created_at: '2024-01-01T00:00:00.000Z',
};

describe('GET /auth/me', () => {
  test('returns the profile with isAdmin for an admin', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([ME_ROW]));
    const res = await request(getApp())
      .get('/api/auth/me')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'user-uuid-1',
      supabaseUid: 'supabase-uid-1',
      email: 'test@example.com',
      displayName: 'Test User',
      isAdmin: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    });
  });

  test('returns isAdmin false for a non-admin', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([{...ME_ROW, is_admin: false}]),
    );
    const res = await request(getApp())
      .get('/api/auth/me')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(false);
  });

  test('returns 404 when the user has no users row', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/auth/me')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
