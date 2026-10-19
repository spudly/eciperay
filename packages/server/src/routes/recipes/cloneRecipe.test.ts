import request from 'supertest';

import {FILTER_CLONABLE_TAG_IDS_SQL} from '../../lib/cloneRecipe.js';
import {HAS_SHARE_GRANT_SQL} from '../../lib/shareGrant.js';
import {hashShareToken} from '../../lib/shareToken.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const shareToken = 'clone-share-token';
const shareTokenHash = hashShareToken(shareToken);

const mockFreeEntitlement = () => {
  // resolveEntitlement: entitlement_overrides, subscriptions, ai_usage.
  mockQuery
    .mockResolvedValueOnce(makeQueryResult([]))
    .mockResolvedValueOnce(makeQueryResult([]))
    .mockResolvedValueOnce(makeQueryResult([]));
};

const mockCloneFlow = (
  sourceOverrides: Parameters<typeof makeRecipeDetailRow>[0] = {},
  recipeCount = '0',
) => {
  mockFreeEntitlement();
  mockQuery
    // withRecipeCap: recipe count for the Free cap check.
    .mockResolvedValueOnce(makeQueryResult([{count: recipeCount}]))
    .mockResolvedValueOnce(
      makeQueryResult([
        makeRecipeDetailRow({
          visibility: 'public',
          user_id: 'owner-uuid',
          ...sourceOverrides,
        }),
      ]),
    )
    .mockResolvedValueOnce(makeQueryResult([]))
    .mockResolvedValueOnce(makeQueryResult([{id: 'tag-owned'}]))
    .mockResolvedValueOnce(makeQueryResult([{id: 'cloned-recipe-id'}]))
    .mockResolvedValue(
      makeQueryResult([
        makeRecipeDetailRow({
          id: 'cloned-recipe-id',
          user_id: 'user-uuid-1',
          cloned_from_recipe_id: 'recipe-uuid-1',
          visibility: 'private',
        }),
      ]),
    );
};

describe('POST /recipes/:id/clone', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('clones a public recipe into the signed-in user library', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockCloneFlow();

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/clone')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('cloned-recipe-id');
    expect(res.body.recipeId).toBe('cloned-recipe-id');
    expect(res.body.clonedFromRecipeId).toBe('recipe-uuid-1');
    expect(res.body.visibility).toBe('private');
    expect(res.body.userId).toBe('user-uuid-1');
    expect(mockQuery).toHaveBeenCalledWith(HAS_SHARE_GRANT_SQL, [
      'recipe-uuid-1',
      'user-uuid-1',
    ]);
    expect(mockQuery).toHaveBeenCalledWith(FILTER_CLONABLE_TAG_IDS_SQL, [
      ['tag-uuid-1'],
      'user-uuid-1',
    ]);
  });

  test('clones an unlisted recipe with a valid share token', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockCloneFlow({visibility: 'unlisted', share_token_hash: shareTokenHash});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/clone')
      .set('Authorization', 'Bearer valid-token')
      .send({shareToken});

    expect(res.status).toBe(201);
    expect(res.body.clonedFromRecipeId).toBe('recipe-uuid-1');
  });

  test('returns 403 for unlisted recipe without access', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockFreeEntitlement();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{count: '0'}]))
      .mockResolvedValueOnce(
        makeQueryResult([
          makeRecipeDetailRow({
            visibility: 'unlisted',
            share_token_hash: shareTokenHash,
            user_id: 'owner-uuid',
          }),
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/clone')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/denied/i);
  });

  test('returns 404 when recipe does not exist', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockFreeEntitlement();
    mockQuery.mockResolvedValueOnce(makeQueryResult([{count: '0'}]));
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/missing-id/clone')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(404);
  });

  test('returns 404 for private recipes', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockFreeEntitlement();
    mockQuery.mockResolvedValueOnce(makeQueryResult([{count: '0'}]));
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([makeRecipeDetailRow({visibility: 'private'})]),
    );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/clone')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(404);
  });

  test('requires authentication', async () => {
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/clone')
      .send({});
    expect(res.status).toBe(401);
  });

  test('returns 400 for invalid body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockFreeEntitlement();
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/clone')
      .set('Authorization', 'Bearer valid-token')
      .send({shareToken: ''});
    expect(res.status).toBe(400);
  });

  test('returns 402 when a free user at the recipe cap clones', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockCloneFlow({}, '50');
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/clone')
      .set('Authorization', 'Bearer <redacted>')
      .send({});
    expect(res.status).toBe(402);
    expect(res.body).toEqual({error: 'recipe_limit', used: 50, limit: 50});
  });

  test('propagates unexpected errors', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockImplementation(() => {
      throw new Error('database unavailable');
    });
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/clone')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(500);
  });
});
