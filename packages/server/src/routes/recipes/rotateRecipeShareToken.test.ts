import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const sharingRow = {
  id: 'recipe-uuid-1',
  user_id: 'user-uuid-1',
  visibility: 'private',
  share_token_hash: null,
};

describe('POST /recipes/:id/sharing/rotate-token', () => {
  test('returns a new share token for unlisted recipes', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {...sharingRow, visibility: 'unlisted', share_token_hash: 'old-hash'},
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
      .post('/api/recipes/recipe-uuid-1/sharing/rotate-token')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.shareToken).toEqual(expect.any(String));
    expect(res.body.visibility).toBe('unlisted');
  });

  test('returns 409 when recipe is not unlisted', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([sharingRow]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/sharing/rotate-token')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/missing-id/sharing/rotate-token')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 404 when visibility update affects no rows', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {...sharingRow, visibility: 'unlisted', share_token_hash: 'old-hash'},
        ]),
      )
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/sharing/rotate-token')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 404 when detail fetch fails after rotation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {...sharingRow, visibility: 'unlisted', share_token_hash: 'old-hash'},
        ]),
      )
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/sharing/rotate-token')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});
