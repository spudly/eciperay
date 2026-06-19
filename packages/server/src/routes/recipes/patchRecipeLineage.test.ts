import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('PATCH /recipes/:id', () => {
  test('returns 200 with updated lifecycle status', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(
        makeQueryResult([
          makeRecipeDetailRow({
            lifecycleStatus: 'evolving',
            status: 'evolving',
          }),
        ]),
      );

    const res = await request(app)
      .patch('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({status: 'evolving'});

    expect(res.status).toBe(200);
    expect(res.body.lifecycleStatus).toBe('evolving');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});

    const res = await request(app)
      .patch('/api/recipes/missing-id')
      .set('Authorization', 'Bearer valid-token')
      .send({status: 'evolving'});

    expect(res.status).toBe(404);
  });

  test('returns 400 when body is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .patch('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({status: 'invalid'});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .patch('/api/recipes/recipe-uuid-1')
      .send({status: 'evolving'});
    expect(res.status).toBe(401);
  });

  test('returns 404 when detail fetch fails after status update', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(makeQueryResult([]));

    const res = await request(app)
      .patch('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({status: 'evolving'});

    expect(res.status).toBe(404);
  });
});
