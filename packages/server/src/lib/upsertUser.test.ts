import {makeUser} from '../test/fixtures/user.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {upsertUserRecord} from './upsertUser.js';

describe('upsertUserRecord', () => {
  test('inserts user with supabase uid as primary key', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([makeUser()]));

    await upsertUserRecord(
      {
        supabaseUid: 'user-uuid-1',
        email: 'test@example.com',
        displayName: 'Test User',
      },
      mockQuery,
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('insert into users'),
      ['user-uuid-1', 'test@example.com', 'Test User'],
    );
  });
});
