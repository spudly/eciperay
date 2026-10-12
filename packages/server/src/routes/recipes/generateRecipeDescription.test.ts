import {jest} from '@jest/globals';
import request from 'supertest';

import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {mockBillingMetered, mockBillingPlan} from '../../test/mockBilling.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('POST /recipes/ai/generate-description', () => {
  test('returns generated description', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('A hearty pasta with fresh basil and garlic.');
    mockBillingMetered(mockQuery, 'plus');
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-description')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: 'Pasta',
        ingredients: ['pasta', 'basil'],
        instructions: ['Boil pasta', 'Toss with sauce'],
        prepTimeMin: 10,
        cookTimeMin: 15,
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      description: 'A hearty pasta with fresh basil and garlic.',
    });
  });

  test('returns 400 for invalid body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-description')
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-description')
      .send({title: 'Pasta'});
    expect(res.status).toBe(401);
  });

  test('returns 502 when generation fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingMetered(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const {anthropic} = await import('../../lib/anthropic.js');
    jest
      .spyOn(anthropic.messages, 'create')
      .mockRejectedValueOnce(new Error('Claude unavailable'));
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-description')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Claude unavailable');
  });

  test('returns 502 for non-error failures', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingMetered(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const {anthropic} = await import('../../lib/anthropic.js');
    jest.spyOn(anthropic.messages, 'create').mockRejectedValueOnce('broken');
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-description')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Description generation failed');
  });
});

