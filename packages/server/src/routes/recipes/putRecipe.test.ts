import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('PUT /recipes/:id', () => {
  test('returns 200 with updated recipe detail', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));

    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput({title: 'Updated Title'}));

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test Recipe');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});
    const res = await request(app)
      .put('/api/recipes/missing-id')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(404);
  });

  test('returns 400 when body is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});
    expect(res.status).toBe(400);
  });

  test('propagates unexpected errors', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockRejectedValue(new Error('db down'));
    await expect(
      request(app)
        .put('/api/recipes/recipe-uuid-1')
        .set('Authorization', 'Bearer valid-token')
        .send(makeRecipeInput()),
    ).resolves.toMatchObject({status: 500});
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .send(makeRecipeInput());
    expect(res.status).toBe(401);
  });
});
