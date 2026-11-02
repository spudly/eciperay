import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionSummaryRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('GET /recipes/:id/versions', () => {
  test('returns 200 with version summaries', async () => {
    const recipeId = '11111111-1111-4111-8111-111111111111';
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionSummaryRow()]));

    const res = await request(getApp())
      .get(`/api/recipes/${recipeId}/versions`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      recipeId,
      'user-uuid-1',
    ]);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].derivedRole).toBe('active');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .get('/api/recipes/22222222-2222-4222-8222-222222222222/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Recipe not found'});
  });

  test('returns 404 for the literal "public" segment without querying the database', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .get('/api/recipes/public/versions')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Recipe not found'});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('returns 404 for a non-UUID id without querying the database', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .get('/api/recipes/not-a-uuid/versions')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Recipe not found'});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).get(
      '/api/recipes/11111111-1111-4111-8111-111111111111/versions',
    );
    expect(res.status).toBe(401);
  });
});
