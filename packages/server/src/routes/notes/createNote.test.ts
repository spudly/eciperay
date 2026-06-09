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
  content: 'Tastes better the next day',
  created_at: '2024-01-01T00:00:00.000Z',
};

describe('POST /recipes/:id/notes', () => {
  test('creates a note and returns 201', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([noteRow]));
    const res = await request(app)
      .post('/recipes/recipe-uuid-1/notes')
      .set('Authorization', 'Bearer valid-token')
      .send({content: 'Tastes better the next day'});
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Tastes better the next day');
  });

  test('returns 400 when content is empty', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/recipes/recipe-uuid-1/notes')
      .set('Authorization', 'Bearer valid-token')
      .send({content: ''});
    expect(res.status).toBe(400);
  });

  test('returns 500 when insert returns no row', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .post('/recipes/recipe-uuid-1/notes')
      .set('Authorization', 'Bearer valid-token')
      .send({content: 'Note'});
    expect(res.status).toBe(500);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/recipes/r/notes')
      .send({content: 'x'});
    expect(res.status).toBe(401);
  });
});
