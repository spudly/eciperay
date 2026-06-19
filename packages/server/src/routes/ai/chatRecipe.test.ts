import request from 'supertest';

import {createApp} from '../../server.js';
import {makeAiMessage} from '../../test/fixtures/aiMessage.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeRecipeDraft} from '../../test/fixtures/recipeDraft.js';
import {makeRecipeDraftRow} from '../../test/fixtures/recipeDraftRow.js';
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

const AI_INGREDIENT_RESPONSE = JSON.stringify({
  reasoning: 'Added moisture and protein.',
  summary_of_changes: 'Adjusted ingredients.',
  diff: {
    ingredients: [
      {name: 'Greek yogurt', quantity: 0.5, unit: 'cup', notes: null},
    ],
  },
});

describe('POST /recipes/:id/ai/chat', () => {
  test('returns mapped draft and assistantMessage on success', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(AI_RESPONSE);
    const priorMessage = makeAiMessage({
      role: 'user',
      content: 'Previous message',
    });
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(
        makeQueryResult([{id: 'convo-1', messages: [priorMessage]}]),
      )
      .mockResolvedValue(makeQueryResult([makeRecipeDraftRow()]));

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/ai/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({message: 'Make it less salty'});

    expect(res.status).toBe(200);
    expect(res.body.draft).toEqual(makeRecipeDraft());
    expect(res.body).toHaveProperty('assistantMessage');
  });

  test('accepts ingredient diffs without sortOrder from Claude', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(AI_INGREDIENT_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            id: 'convo-1',
            recipe_id: 'recipe-uuid-1',
            user_id: 'user-uuid-1',
            messages: [],
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValue(makeQueryResult([makeRecipeDraftRow()]));

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/ai/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({
        message: 'The cake was dry and bland. Add more moisture and protein.',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('assistantMessage');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .post('/api/recipes/missing-id/ai/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({message: 'hello'});
    expect(res.status).toBe(404);
  });

  test('returns 400 when message is empty', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/ai/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({message: ''});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/recipes/r/ai/chat')
      .send({message: 'hi'});
    expect(res.status).toBe(401);
  });

  test('returns 500 when saveDraft returns no row', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(AI_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            id: 'convo-1',
            recipe_id: 'recipe-uuid-1',
            user_id: 'user-uuid-1',
            messages: [],
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValue(makeQueryResult([]));

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/ai/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({message: 'Make it spicier'});
    expect(res.status).toBe(500);
  });

  test('returns 500 when conversation upsert returns no rows', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(AI_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValue(makeQueryResult([]));

    await expect(
      request(app)
        .post('/api/recipes/recipe-uuid-1/ai/chat')
        .set('Authorization', 'Bearer valid-token')
        .send({message: 'Make it spicier'}),
    ).resolves.toMatchObject({status: 500});
  });
});
