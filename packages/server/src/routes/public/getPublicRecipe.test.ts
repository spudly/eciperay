import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {hashShareToken} from '../../lib/shareToken.js';
import {INSERT_SHARE_GRANT_SQL} from '../../lib/shareGrant.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const shareToken = 'public-share-token';
const shareTokenHash = hashShareToken(shareToken);

describe('GET /public/recipes/:id', () => {
  const mockPublicRecipeQueries = (
    row = makeRecipeDetailRow({
      visibility: 'public',
      slug: 'pasta',
      user_id: 'owner-uuid',
    }),
  ) => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([row]));
    }) as typeof mockQuery);
  };

  test('returns public recipe without authentication', async () => {
    mockPublicRecipeQueries();

    const res = await request(getApp()).get(
      '/api/public/recipes/recipe-uuid-1',
    );

    expect(res.status).toBe(200);
    expect(res.body.recipe.id).toBe('recipe-uuid-1');
    expect(res.body.recipe.visibility).toBe('public');
    expect(res.body.recipe.userId).toBeUndefined();
    expect(res.body.canonicalSlug).toBe('pasta');
    expect(res.body.slugMismatch).toBeUndefined();
    expect(res.body.communityRating).toBeNull();
    expect(res.body.viewerRating).toBeNull();
    expect(res.body.viewerRatingIsStale).toBe(false);
  });

  test('returns slug mismatch hint when slug does not match', async () => {
    mockPublicRecipeQueries(
      makeRecipeDetailRow({visibility: 'public', slug: 'pasta'}),
    );

    const res = await request(getApp()).get(
      '/api/public/recipes/recipe-uuid-1/old-slug',
    );

    expect(res.status).toBe(200);
    expect(res.body.canonicalSlug).toBe('pasta');
    expect(res.body.slugMismatch).toBe(true);
  });

  test('returns 404 for private recipes', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({visibility: 'private'})]),
    );

    const res = await request(getApp()).get(
      '/api/public/recipes/recipe-uuid-1',
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('returns 404 when recipe does not exist', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp()).get('/api/public/recipes/missing-id');

    expect(res.status).toBe(404);
  });

  test('returns 403 for unlisted recipe without token', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeRecipeDetailRow({
          visibility: 'unlisted',
          share_token_hash: shareTokenHash,
        }),
      ]),
    );

    const res = await request(getApp()).get(
      '/api/public/recipes/recipe-uuid-1',
    );

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/denied/i);
  });

  test('returns 403 for unlisted recipe with invalid token', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeRecipeDetailRow({
          visibility: 'unlisted',
          share_token_hash: shareTokenHash,
        }),
      ]),
    );

    const res = await request(getApp()).get(
      '/api/public/recipes/recipe-uuid-1?t=bad-token',
    );

    expect(res.status).toBe(403);
  });

  test('returns unlisted recipe with valid share token', async () => {
    mockPublicRecipeQueries(
      makeRecipeDetailRow({
        visibility: 'unlisted',
        slug: 'secret-pasta',
        share_token_hash: shareTokenHash,
      }),
    );

    const res = await request(getApp()).get(
      `/api/public/recipes/recipe-uuid-1/secret-pasta?t=${shareToken}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.recipe.visibility).toBe('unlisted');
    expect(res.body.recipe.userId).toBeUndefined();
    expect(res.body.slugMismatch).toBeUndefined();
  });

  test('records share grant when an authenticated user opens a public recipe', async () => {
    nockSupabaseGetUser('viewer-uuid');
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql === INSERT_SHARE_GRANT_SQL) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(
        makeQueryResult([
          makeRecipeDetailRow({
            visibility: 'public',
            slug: 'pasta',
            user_id: 'owner-uuid',
          }),
        ]),
      );
    }) as typeof mockQuery);

    const res = await request(getApp())
      .get('/api/public/recipes/recipe-uuid-1/pasta')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(INSERT_SHARE_GRANT_SQL, [
      'recipe-uuid-1',
      'viewer-uuid',
      'link',
    ]);
  });

  test('allows authenticated users with an existing grant to open unlisted recipes', async () => {
    nockSupabaseGetUser('viewer-uuid');
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('recipe_share_grants') && sql.includes('exists')) {
        return Promise.resolve(makeQueryResult([{exists: 1}]));
      }
      return Promise.resolve(
        makeQueryResult([
          makeRecipeDetailRow({
            visibility: 'unlisted',
            share_token_hash: shareTokenHash,
            user_id: 'owner-uuid',
          }),
        ]),
      );
    }) as typeof mockQuery);

    const res = await request(getApp())
      .get('/api/public/recipes/recipe-uuid-1/test-recipe')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.recipe.visibility).toBe('unlisted');
  });
});
