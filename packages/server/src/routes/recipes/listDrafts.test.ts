import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDraft} from '../../test/fixtures/recipeDraft.js';
import {makeRecipeDraftRow} from '../../test/fixtures/recipeDraftRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('GET /recipes/:id/drafts', () => {
  test('returns pending drafts mapped to camelCase', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeRecipeDraftRow()]));
    const res = await request(app)
      .get('/recipes/recipe-uuid-1/drafts?status=pending')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([makeRecipeDraft()]);
  });

  test('returns 400 for unsupported status', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .get('/recipes/recipe-uuid-1/drafts?status=approved')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/recipes/r/drafts?status=pending');
    expect(res.status).toBe(401);
  });
});
