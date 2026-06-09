import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDiff} from '../../test/fixtures/recipeDraft.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const pendingDraft = {
  id: 'draft-uuid-1',
  recipe_id: 'recipe-uuid-1',
  diff_json: makeRecipeDiff(),
};

describe('POST /recipes/:id/drafts/:draftId/approve', () => {
  test('returns {status: approved} on success', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([pendingDraft]))
      .mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .post('/recipes/recipe-uuid-1/drafts/draft-uuid-1/approve')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({status: 'approved'});
  });

  test('returns 404 when draft is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .post('/recipes/recipe-uuid-1/drafts/missing/approve')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).post('/recipes/r/drafts/d/approve');
    expect(res.status).toBe(401);
  });
});

describe('POST /recipes/:id/drafts/:draftId/reject', () => {
  test('returns {status: rejected} on success', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([{}]), rowCount: 1});
    const res = await request(app)
      .post('/recipes/recipe-uuid-1/drafts/draft-uuid-1/reject')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({status: 'rejected'});
  });

  test('returns 404 when draft is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    const res = await request(app)
      .post('/recipes/recipe-uuid-1/drafts/missing/reject')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });
});
