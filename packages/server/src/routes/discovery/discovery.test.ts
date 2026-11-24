import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});
const AUTH = 'Bearer test-token';

describe('/discovery (#622 tranche 1)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('requires auth', async () => {
    const res = await request(getApp()).get('/api/discovery/feed');
    expect(res.status).toBe(401);
  });

  test('PUT saved returns 201 with the save', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          user_id: 'user-uuid-1',
          recipe_id: 'recipe-uuid-1',
          created_at: '2026-11-21T00:00:00.000Z',
        },
      ]),
    );
    const res = await request(getApp())
      .put('/api/discovery/saved/recipe-uuid-1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      userId: 'user-uuid-1',
      recipeId: 'recipe-uuid-1',
      createdAt: '2026-11-21T00:00:00.000Z',
    });
  });

  test('DELETE saved returns 404 when nothing was saved', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    const res = await request(getApp())
      .delete('/api/discovery/saved/recipe-uuid-1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  test('GET hidden lists hidden recipes', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          user_id: 'user-uuid-1',
          recipe_id: 'recipe-uuid-1',
          created_at: '2026-11-21T00:00:00.000Z',
          title: 'Soup',
        },
      ]),
    );
    const res = await request(getApp())
      .get('/api/discovery/hidden')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Soup');
  });

  test('POST show-less returns 201 with the entry', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          user_id: 'user-uuid-1',
          source_recipe_id: 'recipe-uuid-1',
          created_at: '2026-11-23T00:00:00.000Z',
        },
      ]),
    );
    const res = await request(getApp())
      .post('/api/discovery/recipes/recipe-uuid-1/show-less')
      .set('Authorization', AUTH);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      userId: 'user-uuid-1',
      sourceRecipeId: 'recipe-uuid-1',
      createdAt: '2026-11-23T00:00:00.000Z',
    });
  });

  test('DELETE show-less returns 404 when there is no entry to undo', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    const res = await request(getApp())
      .delete('/api/discovery/recipes/recipe-uuid-1/show-less')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  test('DELETE show-less returns 204 when an entry is undone', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 1});
    const res = await request(getApp())
      .delete('/api/discovery/recipes/recipe-uuid-1/show-less')
      .set('Authorization', AUTH);
    expect(res.status).toBe(204);
  });

  test('GET show-less lists sources with titles', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          user_id: 'user-uuid-1',
          source_recipe_id: 'recipe-uuid-1',
          created_at: '2026-11-23T00:00:00.000Z',
          title: 'Soup',
        },
      ]),
    );
    const res = await request(getApp())
      .get('/api/discovery/show-less')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Soup');
    expect(res.body[0].sourceRecipeId).toBe('recipe-uuid-1');
  });

  test('PUT following yourself returns 400', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .put('/api/discovery/following/user-uuid-1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('POST signals validates the signal kind', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .post('/api/discovery/signals/recipe-uuid-1')
      .set('Authorization', AUTH)
      .send({signal: 'maybe'});
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('POST signals records dwell interest', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'signal-uuid-1',
          user_id: 'user-uuid-1',
          recipe_id: 'recipe-uuid-1',
          signal: 'interest',
          dwell_ms: 9000,
          created_at: '2026-11-21T00:00:00.000Z',
        },
      ]),
    );
    const res = await request(getApp())
      .post('/api/discovery/signals/recipe-uuid-1')
      .set('Authorization', AUTH)
      .send({signal: 'interest', dwellMs: 9000});
    expect(res.status).toBe(201);
    expect(res.body.signal).toBe('interest');
    expect(res.body.dwellMs).toBe(9000);
  });

  test('GET feed maps rows with ranking facts', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'recipe-uuid-1',
          slug: 'soup',
          visibility: 'public',
          title: 'Soup',
          description: null,
          servings: 4,
          prep_time_min: null,
          cook_time_min: null,
          image_url: null,
          updated_at: '2026-11-21T00:00:00.000Z',
          author_display_name: 'Viewer',
          tags: [],
          calories: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          fiber_g: null,
          sugar_g: null,
          sodium_mg: null,
          prepared_weight_g: null,
          satiety_score: null,
          nutrition_status: 'missing',
          nutrition_disclaimer: null,
          nutrition_updated_at: null,
          community_rating_average: null,
          community_rating_count: 0,
          discovery_score: 3,
          from_followee: 1,
          saved_by_followee: 0,
        },
      ]),
    );
    const res = await request(getApp())
      .get('/api/discovery/feed')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].discoveryScore).toBe(3);
    expect(res.body[0].fromFollowee).toBe(true);
    expect(res.body[0].savedByFollowee).toBe(false);
  });
});
