import request from 'supertest';

import {createApp} from '../../server.js';
import {makeCookLogRow} from '../../test/fixtures/cookLogRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('GET /recipes/:id/versions/:versionId/cooks', () => {
  test('returns 200 with cook logs', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeCookLogRow()]));

    const res = await request(app)
      .get('/api/recipes/recipe-uuid-1/versions/version-uuid-1/cooks')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].recipeVersionId).toBe('version-uuid-1');
  });

  test('returns 404 when version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(app)
      .get('/api/recipes/recipe-uuid-1/versions/missing-version/cooks')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get(
      '/api/recipes/recipe-uuid-1/versions/version-uuid-1/cooks',
    );
    expect(res.status).toBe(401);
  });
});
