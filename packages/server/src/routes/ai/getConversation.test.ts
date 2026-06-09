import request from 'supertest';

import {createApp} from '../../server.js';
import {makeAiMessage} from '../../test/fixtures/aiMessage.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const conversationRow = {
  id: 'conversation-uuid-1',
  recipe_id: 'recipe-uuid-1',
  user_id: 'user-uuid-1',
  messages: [makeAiMessage()],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

describe('GET /recipes/:id/ai/conversation', () => {
  test('returns mapped conversation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([conversationRow]));
    const res = await request(app)
      .get('/recipes/recipe-uuid-1/ai/conversation')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'conversation-uuid-1',
      recipeId: 'recipe-uuid-1',
      userId: 'user-uuid-1',
      messages: [makeAiMessage()],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    });
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/recipes/r/ai/conversation');
    expect(res.status).toBe(401);
  });
});
