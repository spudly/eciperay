import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {
  DEFAULT_RECIPE_LIST_LIMIT,
  MAX_RECIPE_LIST_LIMIT,
} from '../recipes/listRecipes.js';
import {
  LIST_PUBLIC_RECIPES_SQL,
  buildListPublicRecipesSql,
} from '../recipes/sqlConstants.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const emptyFilterBinds = [null, null, null, null, null, null, null];

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
          calories: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          fiber_g: null,
          sugar_g: null,
          sodium_mg: null,
          prepared_weight_g: null,
          satiety_score: 72,
          nutrition_status: 'ready',
          nutrition_disclaimer: null,
          nutrition_updated_at: null,
          community_rating_average: 4.5,
          community_rating_count: 2,
        },
      ]),
    );

    const res = await request(getApp()).get('/api/public/recipes');

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
      satietyScore: 72,
      nutritionStatus: 'ready',
      calories: null,
      proteinG: null,
      communityRating: {average: 4.5, count: 2, hasStaleRatings: false},
    });
    expect(mockQuery).toHaveBeenCalledWith(LIST_PUBLIC_RECIPES_SQL, [
      DEFAULT_RECIPE_LIST_LIMIT,
      0,
      null,
      null,
      ...emptyFilterBinds,
    ]);
  });

  test('passes search, pagination, and sort query params', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp()).get(
      '/api/public/recipes?search=pasta&limit=25&offset=10&sort=rating',
    );

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      buildListPublicRecipesSql('rating', 'desc'),
      [25, 10, 'pasta', null, ...emptyFilterBinds],
    );
  });

  test('caps limit at 500', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await request(getApp()).get('/api/public/recipes?limit=9999');
    expect(mockQuery).toHaveBeenCalledWith(LIST_PUBLIC_RECIPES_SQL, [
      MAX_RECIPE_LIST_LIMIT,
      0,
      null,
      null,
      ...emptyFilterBinds,
    ]);
  });

  test('excludes idea recipes from public discovery SQL', () => {
    expect(LIST_PUBLIC_RECIPES_SQL).toContain("r.status <> 'idea'");
  });

  test('returns 400 for invalid sort', async () => {
    const res = await request(getApp()).get('/api/public/recipes?sort=popular');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sort/i);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('returns 400 for invalid sortDir or status', async () => {
    const badDir = await request(getApp()).get(
      '/api/public/recipes?sortDir=sideways',
    );
    expect(badDir.status).toBe(400);
    expect(badDir.body.error).toMatch(/sortDir/i);

    const badStatus = await request(getApp()).get(
      '/api/public/recipes?status=draft',
    );
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error).toMatch(/status/i);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
