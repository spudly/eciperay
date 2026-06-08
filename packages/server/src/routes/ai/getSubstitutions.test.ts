import request from 'supertest';

import {createApp} from '../../server.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

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
    const res = await request(app)
      .get('/recipes/recipe-uuid-1/ai/substitutions?missing=butter')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].ingredient).toBe('butter');
  });

  test('returns 400 when missing param is absent', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .get('/recipes/recipe-uuid-1/ai/substitutions')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'Provide at least one missing ingredient',
    });
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/recipes/r/ai/substitutions?missing=x');
    expect(res.status).toBe(401);
  });
});
