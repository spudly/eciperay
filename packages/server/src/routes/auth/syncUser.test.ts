import nock from 'nock';
import request from 'supertest';

import {makeUser} from '../../test/fixtures/user.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {
  nockSupabaseGetUser,
  nockSupabaseGetUserError,
} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('POST /auth/sync', () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue(makeQueryResult([makeUser()]));
  });

  test('returns 200 and upserts user with valid token and body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({displayName: 'Test User'});
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('returns 401 when Authorization header is missing', async () => {
    const res = await request(getApp()).post('/api/auth/sync').send({});
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({error: 'Missing authorization token'});
  });

  test('returns 401 when token is invalid', async () => {
    nockSupabaseGetUserError();
    const res = await request(getApp())
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer bad-token')
      .send({});
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({error: 'Invalid or expired token'});
  });

  test('returns 503 (not 401) when the Supabase user lookup fails transiently', async () => {
    const supabaseUrl =
      process.env['SUPABASE_URL'] ?? 'http://supabase-test.local';
    nock(supabaseUrl)
      .get('/auth/v1/user')
      .times(5)
      .reply(500, {message: 'Internal error'});
    const res = await request(getApp())
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      error: 'Authentication service unavailable',
    });
  });

  test('returns 200 when displayName is omitted (uses null fallback)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(200);
  });

  test('returns 400 when body fails Zod validation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({displayName: 'x'.repeat(101)});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({error: 'Validation failed'});
  });

  test('returns 400 when the authenticated user has no email', async () => {
    const supabaseUrl =
      process.env['SUPABASE_URL'] ?? 'http://supabase-test.local';
    nock(supabaseUrl).get('/auth/v1/user').reply(200, {id: 'user-uuid-1'});
    const res = await request(getApp())
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({error: 'Authenticated user has no email'});
  });

  test('returns 500 when user upsert fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockRejectedValue(new Error('database unavailable'));
    const res = await request(getApp())
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({displayName: 'Test User'});
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({error: 'Internal server error'});
  });

  test('two concurrent syncs for a brand-new user both return 200 when one insert loses the users_pkey race', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockSupabaseGetUser('user-uuid-1');
    // Simulate Postgres for two racing first-login inserts of the same
    // new user: one insert violates users_pkey (issue #157) while the
    // other creates the row; the loser must retry and succeed.
    mockQuery.mockRejectedValueOnce(
      Object.assign(
        new Error(
          'duplicate key value violates unique constraint "users_pkey"',
        ),
        {code: '23505', constraint: 'users_pkey'},
      ),
    );
    const app = getApp();
    const [first, second] = await Promise.all([
      request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({displayName: 'Test User'}),
      request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({displayName: 'Test User'}),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });
});
