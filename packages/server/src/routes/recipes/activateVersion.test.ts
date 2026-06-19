import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('POST /recipes/:id/versions/:versionId/activate', () => {
  test('returns 200 with updated active recipe', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.versionId).toBe('version-uuid-1');
  });

  test('returns 404 when version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/versions/missing-version/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).post(
      '/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate',
    );
    expect(res.status).toBe(401);
  });

  test('returns 404 when recipe detail is missing after activation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValue(makeQueryResult([]));

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});
