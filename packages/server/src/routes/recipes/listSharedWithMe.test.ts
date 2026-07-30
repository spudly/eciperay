import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

import {LIST_SHARED_WITH_ME_SQL} from './sqlConstants.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('GET /recipes/shared-with-me', () => {
  test('returns paginated recipes shared with the signed-in user', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeRecipeDetailRow({
          id: 'shared-recipe-1',
          user_id: 'owner-uuid',
          title: 'Shared Pasta',
        }),
      ]),
    );

    const res = await request(getApp())
      .get('/api/recipes/shared-with-me?limit=25&offset=5')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Shared Pasta');
    expect(mockQuery).toHaveBeenCalledWith(LIST_SHARED_WITH_ME_SQL, [
      'user-uuid-1',
      25,
      5,
    ]);
  });

  test('requires authentication', async () => {
    const res = await request(getApp()).get('/api/recipes/shared-with-me');
    expect(res.status).toBe(401);
  });
});
