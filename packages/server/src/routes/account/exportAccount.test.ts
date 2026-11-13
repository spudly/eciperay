import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('GET /account/export', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns an account export bundle', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            email: 'test@example.com',
            display_name: 'Alex',
            created_at: '2024-01-01T00:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            goal_calories_min: null,
            goal_calories_max: null,
            goal_protein_g_min: null,
            goal_protein_g_max: null,
            goal_carbs_g_min: null,
            goal_carbs_g_max: null,
            goal_fat_g_min: null,
            goal_fat_g_max: null,
            goal_satiety_score_min: null,
            goal_satiety_score_max: null,
          },
        ]),
      );

    const res = await request(getApp())
      .get('/api/account/export')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      formatVersion: 1,
      profile: {
        email: 'test@example.com',
        displayName: 'Alex',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      nutritionGoals: {
        caloriesMin: null,
        caloriesMax: null,
        proteinGMin: null,
        proteinGMax: null,
        carbsGMin: null,
        carbsGMax: null,
        fatGMin: null,
        fatGMax: null,
        satietyScoreMin: null,
        satietyScoreMax: null,
      },
      recipes: [],
      shareGrants: [],
      communityRatings: [],
      comments: [],
    });
    expect(res.body.exportedAt).toBeTruthy();
  });

  test('maps share grants, ratings, and comments', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            email: 'test@example.com',
            display_name: null,
            created_at: '2024-01-01T00:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            recipe_id: 'recipe-uuid-1',
            granted_at: '2024-01-02T00:00:00.000Z',
            via: 'link',
          },
        ]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            recipe_id: 'recipe-uuid-2',
            stars: 4,
            content_revision: 2,
            created_at: '2024-01-03T00:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            id: 'comment-uuid-1',
            recipe_id: 'recipe-uuid-3',
            body: 'Nice!',
            content_revision: 1,
            created_at: '2024-01-04T00:00:00.000Z',
            updated_at: '2024-01-05T00:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            goal_calories_min: 1800,
            goal_calories_max: 2200,
            goal_protein_g_min: 150,
            goal_protein_g_max: null,
            goal_carbs_g_min: null,
            goal_carbs_g_max: null,
            goal_fat_g_min: null,
            goal_fat_g_max: null,
            goal_satiety_score_min: 70,
            goal_satiety_score_max: null,
          },
        ]),
      );

    const res = await request(getApp())
      .get('/api/account/export')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.nutritionGoals).toEqual({
      caloriesMin: 1800,
      caloriesMax: 2200,
      proteinGMin: 150,
      proteinGMax: null,
      carbsGMin: null,
      carbsGMax: null,
      fatGMin: null,
      fatGMax: null,
      satietyScoreMin: 70,
      satietyScoreMax: null,
    });
    expect(res.body.shareGrants).toEqual([
      {
        recipeId: 'recipe-uuid-1',
        grantedAt: '2024-01-02T00:00:00.000Z',
        via: 'link',
      },
    ]);
    expect(res.body.communityRatings).toEqual([
      {
        recipeId: 'recipe-uuid-2',
        stars: 4,
        contentRevision: 2,
        createdAt: '2024-01-03T00:00:00.000Z',
      },
    ]);
    expect(res.body.comments).toEqual([
      {
        id: 'comment-uuid-1',
        recipeId: 'recipe-uuid-3',
        body: 'Nice!',
        contentRevision: 1,
        createdAt: '2024-01-04T00:00:00.000Z',
        updatedAt: '2024-01-05T00:00:00.000Z',
      },
    ]);
  });

  test('returns 404 when the user record is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get('/api/account/export')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'User not found'});
  });

  test('returns 401 without authorization', async () => {
    const res = await request(getApp()).get('/api/account/export');
    expect(res.status).toBe(401);
  });
});
