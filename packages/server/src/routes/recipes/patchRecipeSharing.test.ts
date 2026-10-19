import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {mockBillingPlan} from '../../test/mockBilling.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const sharingRow = {
  id: 'recipe-uuid-1',
  user_id: 'user-uuid-1',
  visibility: 'private',
  share_token_hash: null,
};

describe('PATCH /recipes/:id/sharing', () => {
  test('returns updated recipe with share token when publishing unlisted', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([sharingRow]))
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(
        makeQueryResult([
          makeRecipeDetailRow({
            visibility: 'unlisted',
            share_token_hash: 'hash',
          }),
        ]),
      );

    const res = await request(getApp())
      .patch('/api/recipes/recipe-uuid-1/sharing')
      .set('Authorization', 'Bearer valid-token')
      .send({visibility: 'unlisted', publishingConsent: true});

    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe('unlisted');
    expect(res.body.shareToken).toEqual(expect.any(String));
  });

  test('requires publishing consent on first publish', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValue(makeQueryResult([sharingRow]));

    const res = await request(getApp())
      .patch('/api/recipes/recipe-uuid-1/sharing')
      .set('Authorization', 'Bearer valid-token')
      .send({visibility: 'public'});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/consent/i);
  });

  test('403s a free user publishing to public', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'free');

    const res = await request(getApp())
      .patch('/api/recipes/recipe-uuid-1/sharing')
      .set('Authorization', 'Bearer <redacted>')
      .send({visibility: 'public', publishingConsent: true});

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'plan_required',
      requiredPlan: 'plus',
      plan: 'free',
      message: "This feature requires the Plus plan. You're on the Free plan.",
    });
  });

  test('403s a free user publishing to unlisted', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'free');

    const res = await request(getApp())
      .patch('/api/recipes/recipe-uuid-1/sharing')
      .set('Authorization', 'Bearer <redacted>')
      .send({visibility: 'unlisted', publishingConsent: true});

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'plan_required',
      requiredPlan: 'plus',
      plan: 'free',
      message: "This feature requires the Plus plan. You're on the Free plan.",
    });
  });

  test('allows a free user to switch back to private', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'free');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([{...sharingRow, visibility: 'unlisted'}]),
      )
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(
        makeQueryResult([makeRecipeDetailRow({visibility: 'private'})]),
      );

    const res = await request(getApp())
      .patch('/api/recipes/recipe-uuid-1/sharing')
      .set('Authorization', 'Bearer <redacted>')
      .send({visibility: 'private'});

    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe('private');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .patch('/api/recipes/missing-id/sharing')
      .set('Authorization', 'Bearer valid-token')
      .send({visibility: 'private'});

    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid visibility body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .patch('/api/recipes/recipe-uuid-1/sharing')
      .set('Authorization', 'Bearer valid-token')
      .send({visibility: 'secret'});
    expect(res.status).toBe(400);
  });

  test('clears share token when switching to public', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {...sharingRow, visibility: 'unlisted', share_token_hash: 'hash'},
        ]),
      )
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(
        makeQueryResult([
          makeRecipeDetailRow({visibility: 'public', share_token_hash: null}),
        ]),
      );

    const res = await request(getApp())
      .patch('/api/recipes/recipe-uuid-1/sharing')
      .set('Authorization', 'Bearer valid-token')
      .send({visibility: 'public'});

    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe('public');
    expect(res.body.shareToken).toBeUndefined();
  });

  test('does not return a new token when unlisted hash already exists', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {...sharingRow, visibility: 'unlisted', share_token_hash: 'hash'},
        ]),
      )
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(
        makeQueryResult([
          makeRecipeDetailRow({
            visibility: 'unlisted',
            share_token_hash: 'hash',
          }),
        ]),
      );

    const res = await request(getApp())
      .patch('/api/recipes/recipe-uuid-1/sharing')
      .set('Authorization', 'Bearer valid-token')
      .send({visibility: 'unlisted'});

    expect(res.status).toBe(200);
    expect(res.body.shareToken).toBeUndefined();
  });

  test('returns 404 when visibility update affects no rows', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([sharingRow]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});

    const res = await request(getApp())
      .patch('/api/recipes/recipe-uuid-1/sharing')
      .set('Authorization', 'Bearer valid-token')
      .send({visibility: 'private'});

    expect(res.status).toBe(404);
  });

  test('returns 404 when detail fetch fails after update', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([sharingRow]))
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .patch('/api/recipes/recipe-uuid-1/sharing')
      .set('Authorization', 'Bearer valid-token')
      .send({visibility: 'private'});

    expect(res.status).toBe(404);
  });
});
