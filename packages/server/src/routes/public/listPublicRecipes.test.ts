import request from 'supertest';

import {createApp} from '../../server.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {
  DEFAULT_RECIPE_LIST_LIMIT,
  MAX_RECIPE_LIST_LIMIT,
} from '../recipes/listRecipes.js';
import {LIST_PUBLIC_RECIPES_SQL} from '../recipes/sqlConstants.js';

import {parseDiscoverySort} from './listPublicRecipes.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('parseDiscoverySort', () => {
  test('defaults to newest', () => {
    expect(parseDiscoverySort()).toBe('newest');
    expect(parseDiscoverySort('newest')).toBe('newest');
  });

  test('accepts rating for forward compatibility', () => {
    expect(parseDiscoverySort('rating')).toBe('rating');
  });

  test('rejects unknown sort values', () => {
    expect(parseDiscoverySort('popular')).toBeNull();
  });
});

describe('GET /public/recipes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns public discovery results without authentication', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'recipe-public-1',
          slug: 'public-pasta',
          visibility: 'public',
          title: 'Public Pasta',
          description: 'A shared recipe',
          servings: 4,
          prep_time_min: 10,
          cook_time_min: 20,
          image_url: 'https://cdn.example/pasta.jpg',
          updated_at: '2024-01-02T00:00:00.000Z',
          author_display_name: 'Chef Alex',
          tags: [{id: 'tag-1', name: 'Dinner', color: '#6366f1'}],
        },
      ]),
    );

    const res = await request(app).get('/api/public/recipes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual({
      id: 'recipe-public-1',
      slug: 'public-pasta',
      title: 'Public Pasta',
      description: 'A shared recipe',
      servings: 4,
      prepTimeMin: 10,
      cookTimeMin: 20,
      imageUrl: 'https://cdn.example/pasta.jpg',
      visibility: 'public',
      authorDisplayName: 'Chef Alex',
      updatedAt: '2024-01-02T00:00:00.000Z',
      tags: [{id: 'tag-1', name: 'Dinner', color: '#6366f1'}],
    });
    expect(mockQuery).toHaveBeenCalledWith(LIST_PUBLIC_RECIPES_SQL, [
      DEFAULT_RECIPE_LIST_LIMIT,
      0,
      null,
    ]);
  });

  test('passes search, pagination, and sort query params', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(app).get(
      '/api/public/recipes?search=pasta&limit=25&offset=10&sort=rating',
    );

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(LIST_PUBLIC_RECIPES_SQL, [
      25,
      10,
      'pasta',
    ]);
  });

  test('caps limit at 500', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await request(app).get('/api/public/recipes?limit=9999');
    expect(mockQuery).toHaveBeenCalledWith(LIST_PUBLIC_RECIPES_SQL, [
      MAX_RECIPE_LIST_LIMIT,
      0,
      null,
    ]);
  });

  test('returns 400 for invalid sort', async () => {
    const res = await request(app).get('/api/public/recipes?sort=popular');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sort/i);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
