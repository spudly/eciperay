import request from 'supertest';

import {createApp} from '../../server.js';
import {makeAiMessage} from '../../test/fixtures/aiMessage.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {makeRecipeDraft} from '../../test/fixtures/recipeDraft.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const AI_RESPONSE = JSON.stringify({
  reasoning: 'Less salt in the sauce.',
  summary_of_changes: 'Reduced salt.',
  diff: {title: 'Less Salty Pasta'},
});

describe('POST /recipes/:id/ai/chat', () => {
  test('returns draft and assistantMessage on success', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(AI_RESPONSE);
    const draft = makeRecipeDraft();
    const priorMessage = makeAiMessage({
      role: 'user',
      content: 'Previous message',
    });
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetail()])) // fetchRecipeDetail
      .mockResolvedValueOnce(
        makeQueryResult([{id: 'convo-1', messages: [priorMessage]}]),
      ) // getOrCreate conversation (with history)
      .mockResolvedValue(makeQueryResult([draft])); // appendMessage x2 + saveDraft

    const res = await request(app)
      .post('/recipes/recipe-uuid-1/ai/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({message: 'Make it less salty'});

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('draft');
    expect(res.body).toHaveProperty('assistantMessage');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .post('/recipes/missing-id/ai/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({message: 'hello'});
    expect(res.status).toBe(404);
  });

  test('returns 400 when message is empty', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/recipes/recipe-uuid-1/ai/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({message: ''});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/recipes/r/ai/chat')
      .send({message: 'hi'});
    expect(res.status).toBe(401);
  });

  test('returns 500 when conversation upsert returns no rows', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(AI_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetail()])) // fetchRecipeDetail
      .mockResolvedValue(makeQueryResult([])); // getOrCreate returns no rows → throws

    await expect(
      request(app)
        .post('/recipes/recipe-uuid-1/ai/chat')
        .set('Authorization', 'Bearer valid-token')
        .send({message: 'Make it spicier'}),
    ).resolves.toMatchObject({status: 500});
  });
});
