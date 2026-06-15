import request from 'supertest';

import {createApp} from '../../server.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

import {
  DEFAULT_RECIPE_LIST_LIMIT,
  MAX_RECIPE_LIST_LIMIT,
  parseListParams,
} from './listRecipes.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('parseListParams', () => {
  test('defaults limit, offset, and search', () => {
    expect(parseListParams({query: {}})).toEqual({
      limit: DEFAULT_RECIPE_LIST_LIMIT,
      offset: 0,
      search: null,
    });
  });

  test('parses search and caps limit', () => {
    expect(
      parseListParams({
        query: {search: '  pasta  ', limit: '9999', offset: '5'},
      }),
    ).toEqual({limit: MAX_RECIPE_LIST_LIMIT, offset: 5, search: 'pasta'});
  });

  test('ignores blank and non-string search values', () => {
    expect(parseListParams({query: {search: '   '}}).search).toBeNull();
    expect(
      parseListParams({query: {search: 123 as unknown as string}}).search,
    ).toBeNull();
  });

  test('falls back for invalid limit and offset', () => {
    expect(parseListParams({query: {limit: 'bad', offset: '-1'}})).toEqual({
      limit: DEFAULT_RECIPE_LIST_LIMIT,
      offset: 0,
      search: null,
    });
  });
});

describe('GET /recipes', () => {
  test('returns 200 with recipe list', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'recipe-uuid-1',
          title: 'Test Recipe',
          description: 'A test recipe',
          servings: 4,
          prep_time_min: 15,
          cook_time_min: 30,
          image_url: null,
          star_rating: null,
          source_url: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          tags: [],
        },
      ]),
    );
    const res = await request(app)
      .get('/recipes')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      title: 'Test Recipe',
      imageUrl: null,
      cookTimeMin: 30,
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      DEFAULT_RECIPE_LIST_LIMIT,
      0,
      null,
    ]);
  });

  test('passes search to the query', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .get('/recipes')
      .query({search: 'pasta'})
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      DEFAULT_RECIPE_LIST_LIMIT,
      0,
      'pasta',
    ]);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/recipes');
    expect(res.status).toBe(401);
  });

  test('returns 401 when token is invalid', async () => {
    const {nockSupabaseGetUserError} =
      await import('../../test/mockNockSupabase.js');
    nockSupabaseGetUserError();
    const res = await request(app)
      .get('/recipes')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
  });
});
