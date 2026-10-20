import {makeUser} from '../test/fixtures/user.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {upsertUserRecord} from './upsertUser.js';

const makeUniqueViolation = (constraint: string) =>
  Object.assign(
    new Error(`duplicate key value violates unique constraint "${constraint}"`),
    {code: '23505', constraint},
  );

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

  test('retries once and returns the existing row when a concurrent first-login insert wins the users_pkey race', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockRejectedValueOnce(makeUniqueViolation('users_pkey'))
      .mockResolvedValue(makeQueryResult([makeUser()]));

    const result = await upsertUserRecord(
      {
        supabaseUid: 'user-uuid-1',
        email: 'test@example.com',
        displayName: 'Test User',
      },
      mockQuery,
    );

    expect(result.rows).toEqual([makeUser()]);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('insert into users'),
      ['user-uuid-1', 'test@example.com', 'Test User'],
    );
  });

  test('propagates the error when the users_pkey retry also fails', async () => {
    const mockQuery = createMockQuery();
    const retryError = new Error('database unavailable');
    mockQuery
      .mockRejectedValueOnce(makeUniqueViolation('users_pkey'))
      .mockRejectedValue(retryError);

    await expect(
      upsertUserRecord(
        {
          supabaseUid: 'user-uuid-1',
          email: 'test@example.com',
          displayName: 'Test User',
        },
        mockQuery,
      ),
    ).rejects.toBe(retryError);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  test('rethrows unique violations on constraints other than users_pkey without retrying', async () => {
    const mockQuery = createMockQuery();
    const violation = makeUniqueViolation('users_supabase_uid_key');
    mockQuery.mockRejectedValue(violation);

    await expect(
      upsertUserRecord(
        {
          supabaseUid: 'user-uuid-1',
          email: 'test@example.com',
          displayName: 'Test User',
        },
        mockQuery,
      ),
    ).rejects.toBe(violation);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('rethrows non-unique-violation errors without retrying', async () => {
    const mockQuery = createMockQuery();
    const failure = new Error('database unavailable');
    mockQuery.mockRejectedValue(failure);

    await expect(
      upsertUserRecord(
        {
          supabaseUid: 'user-uuid-1',
          email: 'test@example.com',
          displayName: 'Test User',
        },
        mockQuery,
      ),
    ).rejects.toBe(failure);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
