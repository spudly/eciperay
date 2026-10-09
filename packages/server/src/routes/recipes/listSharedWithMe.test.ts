import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

import {
  buildListSharedWithMeSql,
  LIST_SHARED_WITH_ME_SQL,
} from './sqlConstants.js';

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
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  test('requires authentication', async () => {
    const res = await request(getApp()).get('/api/recipes/shared-with-me');
    expect(res.status).toBe(401);
  });

  test('orders by satiety when requested', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/shared-with-me?sort=satiety&sortDir=asc')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      buildListSharedWithMeSql('satiety', 'asc'),
      expect.any(Array),
    );
  });

  test('orders newest shared recipes ascending when requested', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/shared-with-me?sort=newest&sortDir=asc')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      buildListSharedWithMeSql('newest', 'asc'),
      expect.any(Array),
    );
    expect(buildListSharedWithMeSql('newest', 'asc')).toContain(
      'g.granted_at asc',
    );
  });

  test('returns 400 for invalid filter params', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const badStatus = await request(getApp())
      .get('/api/recipes/shared-with-me?status=draft')
      .set('Authorization', 'Bearer valid-token');
    expect(badStatus.status).toBe(400);

    nockSupabaseGetUser('user-uuid-1');
    const badSort = await request(getApp())
      .get('/api/recipes/shared-with-me?sort=popular')
      .set('Authorization', 'Bearer valid-token');
    expect(badSort.status).toBe(400);

    nockSupabaseGetUser('user-uuid-1');
    const badDir = await request(getApp())
      .get('/api/recipes/shared-with-me?sortDir=sideways')
      .set('Authorization', 'Bearer valid-token');
    expect(badDir.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
