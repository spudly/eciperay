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
            goal_calories: null,
            goal_protein_g: null,
            goal_carbs_g: null,
            goal_fat_g: null,
            goal_satiety_score: null,
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
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        satietyScore: null,
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
            goal_calories: 2000,
            goal_protein_g: 150,
            goal_carbs_g: null,
            goal_fat_g: null,
            goal_satiety_score: 70,
          },
        ]),
      );

    const res = await request(getApp())
      .get('/api/account/export')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.nutritionGoals).toEqual({
      calories: 2000,
      proteinG: 150,
      carbsG: null,
      fatG: null,
      satietyScore: 70,
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
