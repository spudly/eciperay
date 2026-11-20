import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  createFamilyShareGrant,
  deleteFamilyShareGrant,
  DELETE_FAMILY_SHARE_GRANT_SQL,
  FIND_USER_BY_EMAIL_SQL,
  INSERT_FAMILY_SHARE_GRANT_SQL,
  listFamilyShareGrants,
} from './familySharing.js';

const mockQuery = createMockQuery();

describe('familySharing (#617)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('lists designations with recipient account details', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          owner_user_id: 'owner-uuid',
          recipient_user_id: 'viewer-uuid',
          recipient_email: 'viewer@example.com',
          recipient_display_name: 'Viewer',
          created_at: '2026-11-20T00:00:00.000Z',
        },
      ]),
    );
    await expect(listFamilyShareGrants('owner-uuid', mockQuery)).resolves.toEqual([
      {
        ownerUserId: 'owner-uuid',
        recipientUserId: 'viewer-uuid',
        recipientEmail: 'viewer@example.com',
        recipientDisplayName: 'Viewer',
        createdAt: '2026-11-20T00:00:00.000Z',
      },
    ]);
  });

  test('designates an existing user found by email', async () => {
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {id: 'viewer-uuid', email: 'viewer@example.com', display_name: null},
        ]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            owner_user_id: 'owner-uuid',
            recipient_user_id: 'viewer-uuid',
            created_at: '2026-11-20T00:00:00.000Z',
          },
        ]),
      );
    const result = await createFamilyShareGrant(
      'owner-uuid',
      'viewer@example.com',
      mockQuery,
    );
    expect(result.kind).toBe('ok');
    expect(mockQuery).toHaveBeenNthCalledWith(1, FIND_USER_BY_EMAIL_SQL, [
      'viewer@example.com',
    ]);
    expect(mockQuery).toHaveBeenNthCalledWith(2, INSERT_FAMILY_SHARE_GRANT_SQL, [
      'owner-uuid',
      'viewer-uuid',
    ]);
  });

  test('unknown email errors without inserting a grant', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await expect(
      createFamilyShareGrant('owner-uuid', 'nobody@example.com', mockQuery),
    ).resolves.toEqual({kind: 'unknown_email'});
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('designating yourself is rejected', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {id: 'owner-uuid', email: 'me@example.com', display_name: null},
      ]),
    );
    await expect(
      createFamilyShareGrant('owner-uuid', 'me@example.com', mockQuery),
    ).resolves.toEqual({kind: 'self'});
  });

  test('revocation deletes the grant row', async () => {
    // pg reports rowCount for DELETE separately from rows.
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 1});
    await expect(
      deleteFamilyShareGrant('owner-uuid', 'viewer-uuid', mockQuery),
    ).resolves.toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(DELETE_FAMILY_SHARE_GRANT_SQL, [
      'owner-uuid',
      'viewer-uuid',
    ]);
    expect(DELETE_FAMILY_SHARE_GRANT_SQL).toContain('family_share_grants');
    expect(DELETE_FAMILY_SHARE_GRANT_SQL).not.toContain('recipe_share_grants');
  });

  test('revoking a missing designation reports false', async () => {
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    await expect(
      deleteFamilyShareGrant('owner-uuid', 'viewer-uuid', mockQuery),
    ).resolves.toBe(false);
  });
});
