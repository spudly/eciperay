import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  HAS_SHARE_GRANT_SQL,
  INSERT_SHARE_GRANT_SQL,
  recordShareGrant,
  shouldAutoRecordShareGrant,
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
