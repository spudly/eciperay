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

describe('POST /recipes/:id/sharing/share-link', () => {
  test('mints a share token for a private recipe without changing visibility (#534)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([sharingRow]))
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
      .post('/api/recipes/recipe-uuid-1/sharing/share-link')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.shareToken).toEqual(expect.any(String));
    expect(res.body.visibility).toBe('private');
    // The visibility update preserves 'private' and stores a token hash.
    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall?.[0]).toContain('share_token_hash');
    expect(updateCall?.[1]?.[2]).toBe('private');
    expect(updateCall?.[1]?.[3]).toEqual(expect.any(String));
  });

  test('a mint records the token in the issued-token set and writes only the hash, guarded on current visibility', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {...sharingRow, visibility: 'unlisted', share_token_hash: 'old'},
        ]),
      )
      .mockResolvedValue({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      });

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/sharing/share-link')
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(200);
    expect(res.body.shareToken).toEqual(expect.any(String));
    const sqls = mockQuery.mock.calls.map(call => String(call[0]));
    // Previously issued links keep working: the mint inserts into the
    // issued-token set and never deletes from it.
    expect(
      sqls.some(sql => sql.includes('insert into recipe_share_tokens')),
    ).toBe(true);
    expect(
      sqls.some(sql => sql.includes('delete from recipe_share_tokens')),
    ).toBe(false);
    // The update writes only the token hash, guarded on the visibility the
    // handler read — a concurrent visibility change is not overwritten.
    const updateCall = mockQuery.mock.calls.find(call =>
      String(call[0]).includes('update recipes'),
    );
    expect(String(updateCall?.[0])).toContain('set share_token_hash');
    expect(String(updateCall?.[0])).not.toContain('set visibility');
    expect(String(updateCall?.[0])).toContain('visibility = $3');
  });

  test('returns a fresh token for an unlisted recipe that already has one', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {...sharingRow, visibility: 'unlisted', share_token_hash: 'old'},
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
      .post('/api/recipes/recipe-uuid-1/sharing/share-link')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.shareToken).toEqual(expect.any(String));
    expect(res.body.visibility).toBe('unlisted');
  });

  test('returns no token for a public recipe (its permalink needs none)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([{...sharingRow, visibility: 'public'}]),
      )
      .mockResolvedValue(
        makeQueryResult([makeRecipeDetailRow({visibility: 'public'})]),
      );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/sharing/share-link')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.shareToken).toBeUndefined();
    expect(res.body.visibility).toBe('public');
  });

  test('returns 404 for a non-owner mint attempt (#534)', async () => {
    nockSupabaseGetUser('other-uuid');
    // The sharing-row lookup is scoped to the requesting user, so a
    // recipe owned by someone else reads as not found.
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/sharing/share-link')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 404 when the recipe does not exist', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/missing-id/sharing/share-link')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});
