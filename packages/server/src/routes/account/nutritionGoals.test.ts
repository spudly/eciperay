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
          goal_calories_min: 1800,
          goal_calories_max: 2200,
          goal_protein_g_min: 150,
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
      .get('/api/account/nutrition-goals')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      caloriesMin: 1800,
      caloriesMax: 2200,
      proteinGMin: 150,
      proteinGMax: null,
      carbsGMin: null,
      carbsGMax: null,
      fatGMin: null,
      fatGMax: null,
      satietyScoreMin: null,
      satietyScoreMax: null,
    });
  });

  test('PUT /account/nutrition-goals updates goals', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {
          goal_calories_min: 1620,
          goal_calories_max: 1980,
          goal_protein_g_min: 120,
          goal_protein_g_max: null,
          goal_carbs_g_min: null,
          goal_carbs_g_max: 200,
          goal_fat_g_min: null,
          goal_fat_g_max: 60,
          goal_satiety_score_min: 55,
          goal_satiety_score_max: null,
        },
      ]),
    );

    const res = await request(getApp())
      .put('/api/account/nutrition-goals')
      .set('Authorization', 'Bearer valid-token')
      .send({
        caloriesMin: 1620,
        caloriesMax: 1980,
        proteinGMin: 120,
        proteinGMax: null,
        carbsGMin: null,
        carbsGMax: 200,
        fatGMin: null,
        fatGMax: 60,
        satietyScoreMin: 55,
        satietyScoreMax: null,
      });

    expect(res.status).toBe(200);
    expect(res.body.satietyScoreMin).toBe(55);
    expect(res.body.caloriesMax).toBe(1980);
  });

  test('PUT returns 400 for invalid body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .put('/api/account/nutrition-goals')
      .set('Authorization', 'Bearer valid-token')
      .send({caloriesMin: -1});

    expect(res.status).toBe(400);
  });

  test('PUT returns 400 when a min exceeds its max', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .put('/api/account/nutrition-goals')
      .set('Authorization', 'Bearer <redacted>')
      .send({
        caloriesMin: 2200,
        caloriesMax: 1800,
        proteinGMin: null,
        proteinGMax: null,
        carbsGMin: null,
        carbsGMax: null,
        fatGMin: null,
        fatGMax: null,
        satietyScoreMin: null,
        satietyScoreMax: null,
      });

    expect(res.status).toBe(400);
  });

  test('PUT returns 404 when user row missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .put('/api/account/nutrition-goals')
      .set('Authorization', 'Bearer valid-token')
      .send({
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
      });

    expect(res.status).toBe(404);
  });
});
