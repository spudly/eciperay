import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('PUT /recipes/:id', () => {
  test('returns 409 when content-locked version ingredient list changes', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(
        makeRecipeInput({
          title: 'Updated Title',
          ingredients: [
            {
              sortOrder: 0,
              name: 'Changed',
              quantity: 1,
              unit: 'cup',
              notes: null,
              isOptional: false,
            },
          ],
        }),
      );

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'Ingredients and instructions are locked on this version',
    );
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(app)
      .put('/api/recipes/missing-id')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(404);
  });

  test('returns 404 when active version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recipe not found');
  });

  test('returns 404 when metadata save update affects no rows', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recipe not found');
  });

  test('returns 400 when body is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});
    expect(res.status).toBe(400);
  });

  test('propagates unexpected errors from metadata save', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockRejectedValueOnce(new Error('db down'));
    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(500);
  });

  test('returns 409 when recipe lifecycle is perfected', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'perfected'})]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([makeVersionDetailRow({status: 'perfected'})]),
      );
    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(409);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .send(makeRecipeInput());
    expect(res.status).toBe(401);
  });
});
