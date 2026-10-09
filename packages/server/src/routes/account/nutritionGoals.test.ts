import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('account nutrition goals routes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('GET /account/nutrition-goals returns goals', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {
          goal_calories: 2000,
          goal_protein_g: 150,
          goal_carbs_g: null,
          goal_fat_g: null,
          goal_satiety_score: null,
        },
      ]),
    );

    const res = await request(getApp())
      .get('/api/account/nutrition-goals')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      calories: 2000,
      proteinG: 150,
      carbsG: null,
      fatG: null,
      satietyScore: null,
    });
  });

  test('PUT /account/nutrition-goals updates goals', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {
          goal_calories: 1800,
          goal_protein_g: 120,
          goal_carbs_g: 200,
          goal_fat_g: 60,
          goal_satiety_score: 55,
        },
      ]),
    );

    const res = await request(getApp())
      .put('/api/account/nutrition-goals')
      .set('Authorization', 'Bearer valid-token')
      .send({
        calories: 1800,
        proteinG: 120,
        carbsG: 200,
        fatG: 60,
        satietyScore: 55,
      });

    expect(res.status).toBe(200);
    expect(res.body.satietyScore).toBe(55);
  });

  test('PUT returns 400 for invalid body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .put('/api/account/nutrition-goals')
      .set('Authorization', 'Bearer valid-token')
      .send({calories: -1});

    expect(res.status).toBe(400);
  });

  test('PUT returns 404 when user row missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .put('/api/account/nutrition-goals')
      .set('Authorization', 'Bearer valid-token')
      .send({
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        satietyScore: null,
      });

    expect(res.status).toBe(404);
  });
});
