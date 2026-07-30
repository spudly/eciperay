import request from 'supertest';

import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('GET /recipes/:id/versions/:versionId', () => {
  test('returns 200 with version detail', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/versions/version-uuid-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test Recipe');
    expect(res.body.derivedRole).toBe('active');
  });

  test('returns 404 when version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/versions/missing-version')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).get(
      '/api/recipes/recipe-uuid-1/versions/version-uuid-1',
    );
    expect(res.status).toBe(401);
  });
});
