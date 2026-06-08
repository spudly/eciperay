import request from 'supertest';

import {createApp} from '../../server.js';
import {makeUser} from '../../test/fixtures/user.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {
  nockSupabaseGetUser,
  nockSupabaseGetUserError,
} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('POST /auth/sync', () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue(makeQueryResult([makeUser()]));
  });

  test('returns 200 and upserts user with valid token and body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/auth/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({email: 'test@example.com', displayName: 'Test User'});
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('returns 401 when Authorization header is missing', async () => {
    const res = await request(app)
      .post('/auth/sync')
      .send({email: 'test@example.com'});
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({error: 'Missing authorization token'});
  });

  test('returns 401 when token is invalid', async () => {
    nockSupabaseGetUserError();
    const res = await request(app)
      .post('/auth/sync')
      .set('Authorization', 'Bearer bad-token')
      .send({email: 'test@example.com'});
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({error: 'Invalid or expired token'});
  });

  test('returns 200 when displayName is omitted (uses null fallback)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/auth/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({email: 'test@example.com'});
    expect(res.status).toBe(200);
  });

  test('returns 400 when body fails Zod validation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/auth/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({email: 'not-an-email'});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({error: 'Validation failed'});
  });
});
