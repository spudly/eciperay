import request from 'supertest';

import {makeTag} from '../../test/fixtures/tag.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});
const AUTH = 'Bearer valid-token';

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
    mockQuery.mockResolvedValue(makeQueryResult([makeTag({name: 'Lunch'})]));
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
    mockQuery.mockResolvedValue(
      makeQueryResult([makeTag({name: 'Weeknight dinners'})]),
    );
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 'Weeknight dinners'});
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Weeknight dinners');
    const [sql, params] = mockQuery.mock.calls[0]!;
    expect(sql).toContain('update tags set name = $1');
    expect(sql).toContain('is_preset = false');
    expect(params).toEqual(['Weeknight dinners', TAG_ID, 'user-uuid-1']);
  });

  test('updates name and color together', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([makeTag({name: 'Lunch', color: '#ef4444'})]),
    );
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 'Lunch', color: '#ef4444'});
    expect(res.status).toBe(200);
    const [sql, params] = mockQuery.mock.calls[0]!;
    expect(sql).toContain('name = $1, color = $2');
    expect(params).toEqual(['Lunch', '#ef4444', TAG_ID, 'user-uuid-1']);
  });

  test('returns 400 when no fields are provided', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 when a field is not a string', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 123});
    expect(res.status).toBe(400);
  });

  test('returns 404 for a malformed id without querying', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .patch('/api/tags/missing-id')
      .set('Authorization', AUTH)
      .send({name: 'Nope'});
    expect(res.status).toBe(404);
    expect(mockQuery.mock.calls).toHaveLength(0);
  });

  test('returns 404 when tag is not found, not owned, or is a preset', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    const res = await request(getApp())
      .patch(`/api/tags/${TAG_ID}`)
      .set('Authorization', AUTH)
      .send({name: 'Nope'});
    expect(res.status).toBe(404);
  });

  test('returns 409 when the new name duplicates another of the user tags', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockRejectedValue(
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
    mockQuery.mockResolvedValue(makeQueryResult([makeTag()]));
    const res = await request(getApp())
      .delete('/api/tags/tag-uuid-1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(204);
  });

  test('returns 404 when tag is not found or is a preset', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
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
