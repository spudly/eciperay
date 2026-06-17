import request from 'supertest';

import {createApp} from '../../server.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const noteRow = {
  id: 'note-uuid-1',
  recipe_id: 'recipe-uuid-1',
  user_id: 'user-uuid-1',
  content: 'Great with extra garlic',
  created_at: '2024-01-01T00:00:00.000Z',
};

describe('GET /recipes/:id/notes', () => {
  test('returns mapped notes for the recipe', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([noteRow]));
    const res = await request(app)
      .get('/api/recipes/recipe-uuid-1/notes')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 'note-uuid-1',
        recipeId: 'recipe-uuid-1',
        userId: 'user-uuid-1',
        content: 'Great with extra garlic',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/recipes/r/notes');
    expect(res.status).toBe(401);
  });
});
