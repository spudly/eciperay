import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('DELETE /recipes/:id', () => {
  test('returns 204 on successful deletion', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([{}]), rowCount: 1});
    const res = await request(getApp())
      .delete('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(204);
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    const res = await request(getApp())
      .delete('/api/recipes/missing-id')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).delete('/api/recipes/recipe-uuid-1');
    expect(res.status).toBe(401);
  });
});
