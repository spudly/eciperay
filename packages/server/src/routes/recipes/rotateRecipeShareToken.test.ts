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

  test('returns a new share token for private recipes, keeping them private (#534)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {...sharingRow, visibility: 'private', share_token_hash: 'old-hash'},
        ]),
      )
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(
        makeQueryResult([
          makeRecipeDetailRow({
            visibility: 'private',
            share_token_hash: 'hash',
          }),
        ]),
      );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/sharing/rotate-token')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.shareToken).toEqual(expect.any(String));
    expect(res.body.visibility).toBe('private');
  });

  test('returns 409 when recipe is public', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([{...sharingRow, visibility: 'public'}]),
    );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/sharing/rotate-token')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });

  test('returns 404 for a non-owner (the sharing row is owner-scoped)', async () => {
    nockSupabaseGetUser('other-uuid');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/sharing/rotate-token')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('rotation deletes every previously issued share token before inserting the fresh one', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {...sharingRow, visibility: 'unlisted', share_token_hash: 'old-hash'},
        ]),
      )
      .mockResolvedValue({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      });

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/sharing/rotate-token')
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(200);
    const sqls = mockQuery.mock.calls.map(call => String(call[0]));
    const deleteIdx = sqls.findIndex(sql =>
      sql.includes('delete from recipe_share_tokens'),
    );
    const insertIdx = sqls.findIndex(sql =>
      sql.includes('insert into recipe_share_tokens'),
    );
    expect(deleteIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(deleteIdx);
    // The guarded update writes only the token hash — never visibility.
    const updateSql = sqls.find(sql => sql.includes('update recipes'));
    expect(updateSql).toContain('set share_token_hash');
    expect(updateSql).not.toContain('set visibility');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/missing-id/sharing/rotate-token')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 404 when the guarded token update affects no rows and the recipe is gone on re-read', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {...sharingRow, visibility: 'unlisted', share_token_hash: 'old-hash'},
        ]),
      )
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0})
      .mockResolvedValueOnce(makeQueryResult([]));

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
