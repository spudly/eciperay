import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('account author display routes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('GET /account/author-display returns settings', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {display_name: 'Chef Alex', show_author_on_public_recipes: false},
      ]),
    );

    const res = await request(getApp())
      .get('/api/account/author-display')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      displayName: 'Chef Alex',
      showOnPublicRecipes: false,
    });
  });

  test('GET returns defaults when the user row is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get('/api/account/author-display')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({displayName: null, showOnPublicRecipes: true});
  });

  test('PUT /account/author-display updates settings and trims the name', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {display_name: 'Chef Alex', show_author_on_public_recipes: true},
      ]),
    );

    const res = await request(getApp())
      .put('/api/account/author-display')
      .set('Authorization', 'Bearer valid-token')
      .send({displayName: '  Chef Alex  ', showOnPublicRecipes: true});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      displayName: 'Chef Alex',
      showOnPublicRecipes: true,
    });
    const updateCall = mockQuery.mock.calls.find(
      call => Array.isArray(call[1]) && call[1][1] === 'Chef Alex',
    );
    expect(updateCall?.[1]).toEqual([expect.any(String), 'Chef Alex', true]);
  });

  test('PUT returns 400 for invalid body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .put('/api/account/author-display')
      .set('Authorization', 'Bearer valid-token')
      .send({displayName: 'Chef Alex'});

    expect(res.status).toBe(400);
  });

  test('PUT returns 404 when user row missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .put('/api/account/author-display')
      .set('Authorization', 'Bearer valid-token')
      .send({displayName: null, showOnPublicRecipes: false});

    expect(res.status).toBe(404);
  });
});
