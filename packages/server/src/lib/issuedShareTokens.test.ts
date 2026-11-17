import {
  clearIssuedShareTokens,
  loadIssuedShareTokenHashes,
  recordIssuedShareToken,
} from './issuedShareTokens.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

const missingTableError = () =>
  Object.assign(new Error('relation "recipe_share_tokens" does not exist'), {
    code: '42P01',
  });

describe('issuedShareTokens', () => {
  test('loads the issued hashes for a recipe', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([{token_hash: 'hash-a'}, {token_hash: 'hash-b'}]),
    );

    await expect(
      loadIssuedShareTokenHashes('recipe-1', mockQuery),
    ).resolves.toEqual(['hash-a', 'hash-b']);
  });

  test('a database without migration 027 reads as an empty issued set', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockRejectedValue(missingTableError());

    await expect(
      loadIssuedShareTokenHashes('recipe-1', mockQuery),
    ).resolves.toEqual([]);
  });

  test('record and clear are no-ops when the table is missing, but other errors propagate', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockRejectedValue(missingTableError());

    await expect(
      recordIssuedShareToken('recipe-1', 'hash-a', mockQuery),
    ).resolves.toBeUndefined();
    await expect(
      clearIssuedShareTokens('recipe-1', mockQuery),
    ).resolves.toBeUndefined();

    mockQuery.mockRejectedValue(new Error('connection lost'));
    await expect(
      loadIssuedShareTokenHashes('recipe-1', mockQuery),
    ).rejects.toThrow('connection lost');
  });
});
