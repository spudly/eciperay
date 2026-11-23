import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});
const AUTH = 'Bearer <redacted>';

describe('discovery router wiring', () => {
  test('GET /discovery/feed returns 401 without auth', async () => {
    const res = await request(getApp()).get('/api/discovery/feed');
    expect(res.status).toBe(401);
  });

  test('GET /discovery/feed returns the feed rows when authed', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/discovery/feed')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('GET /discovery/saved returns 401 without auth', async () => {
    const res = await request(getApp()).get('/api/discovery/saved');
    expect(res.status).toBe(401);
  });

  test('show-less routes return 401 without auth', async () => {
    const list = await request(getApp()).get('/api/discovery/show-less');
    expect(list.status).toBe(401);
    const post = await request(getApp()).post(
      '/api/discovery/recipes/recipe-uuid-1/show-less',
    );
    expect(post.status).toBe(401);
    const del = await request(getApp()).delete(
      '/api/discovery/recipes/recipe-uuid-1/show-less',
    );
    expect(del.status).toBe(401);
  });
});
