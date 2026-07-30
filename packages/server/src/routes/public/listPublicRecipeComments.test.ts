import request from 'supertest';

import {hashShareToken} from '../../lib/shareToken.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const shareToken = 'public-share-token';
const shareTokenHash = hashShareToken(shareToken);

const commentRow = {
  id: 'comment-uuid-1',
  recipe_id: 'recipe-uuid-1',
  user_id: 'viewer-uuid',
  author_display_name: 'Alex',
  body: 'Looks great!',
  content_revision: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

describe('GET /public/recipes/:id/comments', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns comments for public recipes without authentication', async () => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_comments')) {
        return Promise.resolve(makeQueryResult([commentRow]));
      }
      return Promise.resolve(
        makeQueryResult([
          makeRecipeDetailRow({visibility: 'public', content_revision: 2}),
        ]),
      );
    }) as typeof mockQuery);

    const res = await request(getApp()).get(
      '/api/public/recipes/recipe-uuid-1/comments',
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual(
      expect.objectContaining({body: 'Looks great!', isStale: true}),
    );
  });

  test('returns 404 for private recipes', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({visibility: 'private'})]),
    );

    const res = await request(getApp()).get(
      '/api/public/recipes/recipe-uuid-1/comments',
    );

    expect(res.status).toBe(404);
  });

  test('returns 403 for unlisted recipes without token', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeRecipeDetailRow({
          visibility: 'unlisted',
          share_token_hash: shareTokenHash,
        }),
      ]),
    );

    const res = await request(getApp()).get(
      '/api/public/recipes/recipe-uuid-1/comments',
    );

    expect(res.status).toBe(403);
  });

  test('returns 404 when recipe does not exist', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp()).get(
      '/api/public/recipes/missing-id/comments',
    );

    expect(res.status).toBe(404);
  });
});
