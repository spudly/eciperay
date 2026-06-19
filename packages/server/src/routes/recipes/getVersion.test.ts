import request from 'supertest';

import {createApp} from '../../server.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('GET /recipes/:id/versions/:versionId', () => {
  test('returns 200 with version detail', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(app)
      .get('/api/recipes/recipe-uuid-1/versions/version-uuid-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test Recipe');
    expect(res.body.derivedRole).toBe('active');
  });

  test('returns 404 when version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(app)
      .get('/api/recipes/recipe-uuid-1/versions/missing-version')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get(
      '/api/recipes/recipe-uuid-1/versions/version-uuid-1',
    );
    expect(res.status).toBe(401);
  });
});
