import request from 'supertest';

import {makeTag} from '../../test/fixtures/tag.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});
const AUTH = 'Bearer valid-token';

/**
 * Wraps mockQuery.mockImplementation for SQL-routing mocks (same approach as
 * entitlement.test.ts): the requireAdmin lookup (#621) is answered from
 * `isAdmin`, every other query goes to impl.
 */
const mockRouteQueries = (
  impl: (text: string, params?: unknown) => Promise<unknown>,
  isAdmin: boolean,
) => {
  mockQuery.mockImplementation(((text: string, params?: unknown) => {
    if (typeof text === 'string' && text.includes('is_admin')) {
      return Promise.resolve(makeQueryResult([{is_admin: isAdmin}]));
    }
    return impl(text, params);
  }) as never);
};

const mockAdminResult = (result: unknown) =>
  mockRouteQueries(() => Promise.resolve(result), true);

const mockAdminError = (error: unknown) =>
  mockRouteQueries(() => Promise.reject(error), true);

const mockNonAdmin = () =>
  mockRouteQueries(() => Promise.resolve(makeQueryResult([makeTag()])), false);

describe('GET /tags', () => {
  test('returns 200 with tag list', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeTag()]));
    const res = await request(getApp())
      .get('/api/tags')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).get('/api/tags');
    expect(res.status).toBe(401);
  });
});

describe('POST /tags', () => {
  test('returns 201 with the created tag', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminResult(makeQueryResult([makeTag({name: 'Lunch'})]));
    const res = await request(getApp())
      .post('/api/tags')
      .set('Authorization', AUTH)
      .send({name: 'Lunch'});
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Lunch');
  });
});

describe('PATCH /tags/:id', () => {
  const TAG_ID = '11111111-1111-4111-8111-111111111111';

  test('returns 200 with the renamed tag', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminResult(makeQueryResult([makeTag({name: 'Weeknight dinners'})]));
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 'Weeknight dinners'});
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Weeknight dinners');
    const [sql, params] = mockQuery.mock.calls.find(([text]) =>
      String(text).includes('update tags'),
    )!;
    expect(sql).toContain('update tags set name = $1');
    expect(sql).toContain('user_id = $3');
    expect(sql).toContain('is_preset = false');
    expect(params).toEqual(['Weeknight dinners', TAG_ID, 'user-uuid-1']);
  });

  test('updates name and color together', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminResult(
      makeQueryResult([makeTag({name: 'Lunch', color: '#ef4444'})]),
    );
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 'Lunch', color: '#ef4444'});
    expect(res.status).toBe(200);
    const [sql, params] = mockQuery.mock.calls.find(([text]) =>
      String(text).includes('update tags'),
    )!;
    expect(sql).toContain('name = $1, color = $2');
    expect(params).toEqual(['Lunch', '#ef4444', TAG_ID, 'user-uuid-1']);
  });

  test('returns 400 when no fields are provided', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminResult(makeQueryResult([]));
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 when a field is not a string', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminResult(makeQueryResult([]));
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 123});
    expect(res.status).toBe(400);
  });

  test('returns 404 for a malformed id without querying the tags table', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminResult(makeQueryResult([]));
    const res = await request(getApp())
      .patch('/api/tags/missing-id')
      .set('Authorization', AUTH)
      .send({name: 'Nope'});
    expect(res.status).toBe(404);
    // Only the requireAdmin lookup ran; no tags query was issued.
    expect(mockQuery.mock.calls).toHaveLength(1);
    expect(String(mockQuery.mock.calls[0]![0])).toContain('is_admin');
  });

  test('returns 404 when tag is not found, not owned, or is a preset', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminResult({...makeQueryResult([]), rowCount: 0});
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 'Nope'});
    expect(res.status).toBe(404);
  });

  test('returns 409 when the new name duplicates another of the user tags', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminError(
      Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'tags_user_id_name_key',
      }),
    );
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 'Dinner'});
    expect(res.status).toBe(409);
  });

  test('returns 400 when the request has no body at all', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminResult(makeQueryResult([]));
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Nothing to update');
  });

  test('returns 500 when the update fails with a non-conflict error', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminError(new Error('connection lost'));
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 'Dinner'});
    expect(res.status).toBe(500);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .send({name: 'Nope'});
    expect(res.status).toBe(401);
  });
});

describe('DELETE /tags/:id', () => {
  test('returns 204 when tag is deleted', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminResult(makeQueryResult([makeTag()]));
    const res = await request(getApp())
      .delete('/api/tags/tag-uuid-1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(204);
  });

  test('returns 404 when tag is not found or is a preset', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockAdminResult({...makeQueryResult([]), rowCount: 0});
    const res = await request(getApp())
      .delete('/api/tags/missing-id')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).delete('/api/tags/tag-uuid-1');
    expect(res.status).toBe(401);
  });
});

describe('admin gate (#621)', () => {
  const TAG_ID = '11111111-1111-4111-8111-111111111111';

  test('GET /tags still works for a non-admin', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockNonAdmin();
    const res = await request(getApp())
      .get('/api/tags')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('POST /tags returns 403 for a non-admin', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockNonAdmin();
    const res = await request(getApp())
      .post('/api/tags')
      .set('Authorization', AUTH)
      .send({name: 'Lunch'});
    expect(res.status).toBe(403);
    expect(res.body).toEqual({error: 'Admin access required'});
  });

  test('PATCH /tags/:id returns 403 for a non-admin', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockNonAdmin();
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 'Nope'});
    expect(res.status).toBe(403);
  });

  test('DELETE /tags/:id returns 403 for a non-admin', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockNonAdmin();
    const res = await request(getApp())
      .delete(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH);
    expect(res.status).toBe(403);
  });
});
