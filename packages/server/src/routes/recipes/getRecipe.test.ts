import request from 'supertest';

import {hashShareToken} from '../../lib/shareToken.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('GET /recipes/:id', () => {
  test('returns 200 with recipe detail when found', async () => {
    const recipeId = '11111111-1111-4111-8111-111111111111';
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(
        makeQueryResult([makeRecipeDetailRow({id: recipeId})]),
      );
    }) as typeof mockQuery);
    const res = await request(getApp())
      .get(`/api/recipes/${recipeId}`)
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      recipeId,
      'user-uuid-1',
    ]);
    expect(res.body).toEqual({
      ...makeRecipeDetail({id: recipeId}),
      communityRating: null,
      viewerRating: null,
      viewerRatingIsStale: false,
    });
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/22222222-2222-4222-8222-222222222222')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Recipe not found'});
  });

  test('returns 404 for the literal "public" segment without querying the database', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .get('/api/recipes/public')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Recipe not found'});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('returns 404 for a non-UUID id without querying the database', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .get('/api/recipes/not-a-uuid')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Recipe not found'});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).get(
      '/api/recipes/11111111-1111-4111-8111-111111111111',
    );
    expect(res.status).toBe(401);
  });

  describe('shared (unlisted) recipes, #649', () => {
    const recipeId = '33333333-3333-4333-8333-333333333333';
    const shareToken = 'share-token';
    const unlistedRow = () =>
      makeRecipeDetailRow({
        id: recipeId,
        user_id: 'owner-uuid',
        visibility: 'unlisted',
        share_token_hash: hashShareToken(shareToken),
      });

    const mockAccess = ({
      row,
      hasGrant,
    }: {
      row: ReturnType<typeof makeRecipeDetailRow>;
      hasGrant: boolean;
    }) => {
      mockQuery.mockImplementation(((sql: string) => {
        if (sql.includes('recipe_ratings rr')) {
          return Promise.resolve(makeQueryResult([]));
        }
        if (sql.includes('insert into recipe_share_grants')) {
          return Promise.resolve(makeQueryResult([]));
        }
        if (sql.includes('from recipe_share_tokens')) {
          return Promise.resolve(makeQueryResult([]));
        }
        if (sql.includes('recipe_share_grants')) {
          return Promise.resolve(makeQueryResult(hasGrant ? [{found: 1}] : []));
        }
        return Promise.resolve(makeQueryResult([row]));
      }) as typeof mockQuery);
    };

    test('returns 200 for a non-owner holding a share grant', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockAccess({row: unlistedRow(), hasGrant: true});
      const res = await request(getApp())
        .get(`/api/recipes/${recipeId}`)
        .set('Authorization', 'Bearer <redacted>');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({id: recipeId});
    });

    test('returns 200 with a valid share token and records a grant', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockAccess({row: unlistedRow(), hasGrant: false});
      const res = await request(getApp())
        .get(`/api/recipes/${recipeId}?t=${shareToken}`)
        .set('Authorization', 'Bearer <redacted>');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({id: recipeId});
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('insert into recipe_share_grants'),
        [recipeId, 'user-uuid-1', 'link'],
      );
    });

    test('returns 404 with an invalid share token and no grant', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockAccess({row: unlistedRow(), hasGrant: false});
      const res = await request(getApp())
        .get(`/api/recipes/${recipeId}?t=wrong-token`)
        .set('Authorization', 'Bearer <redacted>');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({error: 'Recipe not found'});
    });

    test('returns 404 for a non-owner with no token and no grant', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockAccess({row: unlistedRow(), hasGrant: false});
      const res = await request(getApp())
        .get(`/api/recipes/${recipeId}`)
        .set('Authorization', 'Bearer <redacted>');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({error: 'Recipe not found'});
    });

    test('returns 200 for a private recipe with a valid share token (#534 bearer grant)', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockAccess({
        row: makeRecipeDetailRow({
          id: recipeId,
          user_id: 'owner-uuid',
          visibility: 'private',
          share_token_hash: hashShareToken(shareToken),
        }),
        hasGrant: false,
      });
      const res = await request(getApp())
        .get(`/api/recipes/${recipeId}?t=${shareToken}`)
        .set('Authorization', 'Bearer <redacted>');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({id: recipeId});
    });

    test('returns 404 for a private recipe with an invalid share token', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockAccess({
        row: makeRecipeDetailRow({
          id: recipeId,
          user_id: 'owner-uuid',
          visibility: 'private',
          share_token_hash: hashShareToken(shareToken),
        }),
        hasGrant: false,
      });
      const res = await request(getApp())
        .get(`/api/recipes/${recipeId}?t=wrong-token`)
        .set('Authorization', 'Bearer <redacted>');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({error: 'Recipe not found'});
    });
  });
});
