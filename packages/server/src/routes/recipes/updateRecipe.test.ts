import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('PATCH /recipes/:id', () => {
  test('returns 200 with updated recipe detail', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const detail = makeRecipeDetail({title: 'Updated Title'});
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([detail]));

    const res = await request(app)
      .patch('/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Updated Title'});

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    const res = await request(app)
      .patch('/recipes/missing-id')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'New'});
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .patch('/recipes/recipe-uuid-1')
      .send({title: 'X'});
    expect(res.status).toBe(401);
  });
});
