import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {makeRecipeDiff} from '../../test/fixtures/recipeDraft.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
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
  test('returns RecipeDetail on success', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([pendingDraft]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/drafts/draft-uuid-1/approve')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(makeRecipeDetail());
  });

  test('applies ingredient and instruction diffs when present', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const diff = makeRecipeDiff({
      ingredients: [
        {
          sortOrder: 0,
          name: 'Salt',
          quantity: 1,
          unit: 'tsp',
          notes: null,
          isOptional: false,
        },
      ],
      instructions: [{stepNumber: 1, body: 'Season well'}],
    });
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([{...pendingDraft, diff_json: diff}]),
      )
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/drafts/draft-uuid-1/approve')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
  });

  test('returns 404 when draft is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/drafts/missing/approve')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });

  test('returns 404 when recipe detail is missing after approve', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([pendingDraft]))
      .mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/drafts/draft-uuid-1/approve')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/recipes/r/drafts/d/approve');
    expect(res.status).toBe(401);
  });
});

describe('POST /recipes/:id/drafts/:draftId/reject', () => {
  test('returns {status: rejected} on success', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([{}]), rowCount: 1});
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/drafts/draft-uuid-1/reject')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({status: 'rejected'});
  });

  test('returns 404 when draft is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/drafts/missing/reject')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });
});
