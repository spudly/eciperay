import nock from 'nock';
import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {mockBillingMetered, mockBillingPlan} from '../../test/mockBilling.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

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
  test('returns 201 RecipeDetail from image via Claude vision', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(RECIPE_JSON);
    mockBillingMetered(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(
        makeQueryResult([
          makeRecipeDetailRow({title: 'Scanned Cake', servings: 8}),
        ]),
      );
    const res = await request(getApp())
      .post('/api/recipes/import/image')
      .set('Authorization', 'Bearer valid-token')
      .send({imageBase64: 'base64encodedimage=='});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Scanned Cake');
    expect(res.body.servings).toBe(8);
  });

  test('returns 400 when imageBase64 is empty', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .post('/api/recipes/import/image')
      .set('Authorization', 'Bearer valid-token')
      .send({imageBase64: ''});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .post('/api/recipes/import/image')
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
    mockBillingMetered(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post('/api/recipes/import/image')
      .set('Authorization', 'Bearer valid-token')
      .send({imageBase64: 'abc123'});
    expect(res.status).toBe(500);
  });
});

