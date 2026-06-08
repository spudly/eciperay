import nock from 'nock';
import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {makeRecipeDraft} from '../../test/fixtures/recipeDraft.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const AI_RESPONSE = JSON.stringify({
  summary_of_changes: 'Improved clarity.',
  diff: {description: 'Clearer instructions.'},
});

describe('POST /recipes/:id/ai/cleanup', () => {
  test('returns a draft on success', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(AI_RESPONSE);
    const draft = makeRecipeDraft();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetail()]))
      .mockResolvedValue(makeQueryResult([draft]));

    const res = await request(app)
      .post('/recipes/recipe-uuid-1/ai/cleanup')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('draft');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .post('/recipes/missing/ai/cleanup')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).post('/recipes/r/ai/cleanup');
    expect(res.status).toBe(401);
  });
});

describe('POST /recipes/:id/ai/cleanup (error paths)', () => {
  test('propagates error when Claude returns non-text response', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://api.anthropic.com')
      .post('/v1/messages')
      .reply(200, {
        id: 'msg-test',
        type: 'message',
        role: 'assistant',
        content: [{type: 'tool_use', id: 'x', name: 'y', input: {}}],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        usage: {input_tokens: 10, output_tokens: 5},
      });
    mockQuery.mockResolvedValueOnce(makeQueryResult([makeRecipeDetail()]));
    const res = await request(app)
      .post('/recipes/recipe-uuid-1/ai/cleanup')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(500);
  });
});
