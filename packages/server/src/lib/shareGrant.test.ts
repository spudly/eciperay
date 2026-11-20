import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  HAS_FAMILY_SHARE_GRANT_FOR_RECIPE_SQL,
  HAS_FAMILY_SHARE_GRANT_SQL,
  HAS_SHARE_ACCESS_SQL,
  HAS_SHARE_GRANT_SQL,
  INSERT_SHARE_GRANT_SQL,
  recordShareGrant,
  shouldAutoRecordShareGrant,
  getShareAccessBasis,
  SHARE_ACCESS_BASIS_SQL,
  userHasFamilyShareGrant,
  userHasFamilyShareGrantForRecipe,
  userHasShareAccess,
  userHasShareGrant,
} from './shareGrant.js';

const mockQuery = createMockQuery();

describe('shouldAutoRecordShareGrant', () => {
  test('records grants for signed-in non-owners only', () => {
    expect(shouldAutoRecordShareGrant('viewer-uuid', 'owner-uuid')).toBe(true);
    expect(shouldAutoRecordShareGrant('owner-uuid', 'owner-uuid')).toBe(false);
    expect(shouldAutoRecordShareGrant(undefined, 'owner-uuid')).toBe(false);
  });
});

describe('userHasShareGrant', () => {
  test('returns true when a grant row exists', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([{exists: 1}]));
    await expect(
      userHasShareGrant('recipe-uuid-1', 'viewer-uuid', mockQuery),
    ).resolves.toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(HAS_SHARE_GRANT_SQL, [
      'recipe-uuid-1',
      'viewer-uuid',
    ]);
  });

  test('returns false when no grant row exists', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await expect(
      userHasShareGrant('recipe-uuid-1', 'viewer-uuid', mockQuery),
    ).resolves.toBe(false);
  });

  test('returns false when rowCount is null', async () => {
    mockQuery.mockResolvedValue({
      ...makeQueryResult([{exists: 1}]),
      rowCount: null,
    });
    await expect(
      userHasShareGrant('recipe-uuid-1', 'viewer-uuid', mockQuery),
    ).resolves.toBe(false);
  });
});

describe('recordShareGrant', () => {
  test('inserts a link grant for the recipe and user', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await recordShareGrant('recipe-uuid-1', 'viewer-uuid', 'link', mockQuery);
    expect(mockQuery).toHaveBeenCalledWith(INSERT_SHARE_GRANT_SQL, [
      'recipe-uuid-1',
      'viewer-uuid',
      'link',
    ]);
  });
});

describe('family share grants (#617)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('userHasFamilyShareGrant checks owner -> recipient', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([{exists: 1}]));
    await expect(
      userHasFamilyShareGrant('owner-uuid', 'viewer-uuid', mockQuery),
    ).resolves.toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(HAS_FAMILY_SHARE_GRANT_SQL, [
      'owner-uuid',
      'viewer-uuid',
    ]);
  });

  test('userHasFamilyShareGrant is false for non-designated users', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await expect(
      userHasFamilyShareGrant('owner-uuid', 'stranger-uuid', mockQuery),
    ).resolves.toBe(false);
  });

  test('userHasFamilyShareGrantForRecipe resolves the owner from the recipe', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([{exists: 1}]));
    await expect(
      userHasFamilyShareGrantForRecipe('recipe-uuid-1', 'viewer-uuid', mockQuery),
    ).resolves.toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      HAS_FAMILY_SHARE_GRANT_FOR_RECIPE_SQL,
      ['recipe-uuid-1', 'viewer-uuid'],
    );
    expect(HAS_FAMILY_SHARE_GRANT_FOR_RECIPE_SQL).toContain('family_share_grants');
  });

  test('userHasShareAccess gives read/clone access via a family grant', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([{exists: 1}]));
    await expect(
      userHasShareAccess('recipe-uuid-1', 'viewer-uuid', mockQuery),
    ).resolves.toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(HAS_SHARE_ACCESS_SQL, [
      'recipe-uuid-1',
      'viewer-uuid',
    ]);
    // The combined check covers both grant tables: revoking the family row
    // (row delete) ends family access, while a per-recipe row still counts.
    expect(HAS_SHARE_ACCESS_SQL).toContain('recipe_share_grants');
    expect(HAS_SHARE_ACCESS_SQL).toContain('family_share_grants');
  });

  test('userHasShareAccess is false when neither grant exists (revoked / never designated)', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await expect(
      userHasShareAccess('recipe-uuid-1', 'viewer-uuid', mockQuery),
    ).resolves.toBe(false);
  });
});

describe('getShareAccessBasis (#617)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('reads both bases from one query', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([{has_individual_grant: false, has_family_grant: true}]),
    );
    await expect(
      getShareAccessBasis('recipe-uuid-1', 'viewer-uuid', mockQuery),
    ).resolves.toEqual({hasIndividualGrant: false, hasFamilyGrant: true});
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(SHARE_ACCESS_BASIS_SQL, [
      'recipe-uuid-1',
      'viewer-uuid',
    ]);
  });

  test('defaults both bases to false when no row comes back', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await expect(
      getShareAccessBasis('recipe-uuid-1', 'viewer-uuid', mockQuery),
    ).resolves.toEqual({hasIndividualGrant: false, hasFamilyGrant: false});
  });
});
