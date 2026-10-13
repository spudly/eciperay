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

const SUBS_RESPONSE = JSON.stringify([
  {
    ingredient: 'butter',
    suggestions: ['margarine', 'coconut oil', 'olive oil'],
  },
]);

describe('GET /recipes/:id/ai/substitutions', () => {
  test('returns substitutions array', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(SUBS_RESPONSE);
    mockBillingMetered(mockQuery, 'plus');
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/substitutions?missing=butter')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].ingredient).toBe('butter');
  });

  test('returns 400 when missing param is absent', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/substitutions')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'Provide at least one missing ingredient',
    });
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).get(
      '/api/recipes/r/ai/substitutions?missing=x',
    );
    expect(res.status).toBe(401);
  });

  test('refunds the AI quota and rethrows when Claude fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingMetered(mockQuery, 'plus');
    // refundAiCall's UPDATE after the failed provider call.
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    anthropicCreateSpy.mockRejectedValueOnce(new Error('AI down'));

    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/substitutions?missing=butter')
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(500);
    const refundCall = mockQuery.mock.calls.find(args =>
      args[0].includes('update ai_usage'),
    );
    expect(refundCall).toBeDefined();
  });
});
