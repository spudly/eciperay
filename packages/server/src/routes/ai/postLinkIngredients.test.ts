import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {
  anthropicCreateSpy,
  nockAnthropicMessage,
} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {mockBillingMetered, mockBillingPlan} from '../../test/mockBilling.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const BODY = {
  ingredients: [
    {id: 'ing-onion', name: 'yellow onion'},
    {id: 'ing-carrot', name: 'carrots'},
  ],
  instructions: [
    {id: 'step-1', body: 'Chop the onion.'},
    {id: 'step-2', body: 'Add the vegetables and simmer.'},
  ],
};

const AI_RESPONSE = JSON.stringify({
  links: [
    {instructionId: 'step-1', ingredientIds: ['ing-onion']},
    {instructionId: 'step-2', ingredientIds: ['ing-onion', 'ing-carrot']},
  ],
});

describe('POST /recipes/:id/ai/link-ingredients', () => {
  test('returns the merged linking proposal', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(AI_RESPONSE);
    mockBillingMetered(mockQuery, 'plus');
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/ai/link-ingredients')
      .set('Authorization', 'Bearer <redacted>')
      .send(BODY);
    expect(res.status).toBe(200);
    expect(res.body.links).toEqual([
      {instructionId: 'step-1', ingredientIds: ['ing-onion']},
      {instructionId: 'step-2', ingredientIds: ['ing-onion', 'ing-carrot']},
    ]);
    expect(res.body.unreferencedIngredientIds).toEqual([]);
  });

  test('returns 400 when ingredients or instructions are empty', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/ai/link-ingredients')
      .set('Authorization', 'Bearer <redacted>')
      .send({ingredients: [], instructions: []});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'Provide non-empty ingredients and instructions arrays',
    });
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .post('/api/recipes/r/ai/link-ingredients')
      .send(BODY);
    expect(res.status).toBe(401);
  });

  test('refunds the AI quota and rethrows when Claude fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingMetered(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    anthropicCreateSpy.mockRejectedValueOnce(new Error('AI down'));
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/ai/link-ingredients')
      .set('Authorization', 'Bearer <redacted>')
      .send(BODY);
    expect(res.status).toBe(500);
  });
});
