import nock from 'nock';
import request from 'supertest';

import {createApp} from '../../server.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const RECIPE_JSON = JSON.stringify({
  title: 'Scanned Cake',
  description: null,
  servings: 8,
  prepTimeMin: null,
  cookTimeMin: null,
  sourceUrl: null,
  ingredients: [
    {
      sortOrder: 0,
      name: 'flour',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Mix'}],
});

describe('POST /recipes/import/image', () => {
  test('returns parsed recipe from image via Claude vision', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(RECIPE_JSON);
    const res = await request(app)
      .post('/recipes/import/image')
      .set('Authorization', 'Bearer valid-token')
      .send({imageBase64: 'base64encodedimage=='});
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Scanned Cake');
    expect(res.body.servings).toBe(8);
  });

  test('returns 400 when imageBase64 is empty', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/recipes/import/image')
      .set('Authorization', 'Bearer valid-token')
      .send({imageBase64: ''});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/recipes/import/image')
      .send({imageBase64: 'x'});
    expect(res.status).toBe(401);
  });

  test('returns 500 when Claude returns non-text content', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://api.anthropic.com')
      .post('/v1/messages')
      .reply(200, {
        id: 'msg-test',
        type: 'message',
        role: 'assistant',
        content: [{type: 'tool_use', id: 'x', name: 'y', input: {}}],
        model: 'claude-3-opus-20240229',
        stop_reason: 'tool_use',
        usage: {input_tokens: 10, output_tokens: 5},
      });
    const res = await request(app)
      .post('/recipes/import/image')
      .set('Authorization', 'Bearer valid-token')
      .send({imageBase64: 'abc123'});
    expect(res.status).toBe(500);
  });
});
