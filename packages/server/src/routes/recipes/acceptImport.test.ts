import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('POST /recipes/:id/import/accept', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('accepts import and moves idea to evolving', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'idea'})]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'evolving'})]),
      );
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/import/accept')
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('evolving');
  });

  test('returns 404 when recipe not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(app)
      .post('/api/recipes/missing/import/accept')
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
  });

  test('returns 409 when recipe lifecycle is locked', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([makeRecipeDetailRow({status: 'perfected'})]),
    );
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/import/accept')
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(409);
  });

  test('returns 404 when refreshed recipe is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'evolving'})]),
      )
      .mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/import/accept')
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
  });
});
