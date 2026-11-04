import {jest} from '@jest/globals';
import type {QueryResult} from 'pg';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {
  accessibleRecipeRow,
  mealRecipeRow,
  mealRow,
} from '../test/fixtures/mealQueryRows.js';
import {
  emptyShareGrant,
  MEAL_ID,
  mealInput,
  USER_ID,
} from '../test/mealQueryMock.js';

type MockClient = {
  query: jest.Mock<(text: string, params?: unknown[]) => Promise<QueryResult>>;
  release: jest.Mock<() => void>;
};

const mockRelease = jest.fn<() => void>();
const mockConnect = jest.fn<() => Promise<MockClient>>();
const mockPoolQuery =
  jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();

// The default-query replace path runs through the pool (runTransactional
// opens a transaction only for the real pool query), so the pool is
// mocked to exercise BEGIN/COMMIT/ROLLBACK behavior (#403). Tests that
// inject their own query function live in saveMeal.test.ts and never
// touch the pool.
jest.unstable_mockModule('../db/pool.js', () => ({
  default: {connect: mockConnect, query: mockPoolQuery},
}));

const {replaceMeal} = await import('./saveMeal.js');

describe('replaceMeal on the default query path (transactions)', () => {
  // Queries that run outside the transaction (the existence and
  // accessibility reads, and the post-save detail load) go through the
  // pool's shared query.
  const installPoolRouting = () => {
    mockPoolQuery.mockImplementation((text: string) => {
      if (text.includes('select id from meals')) {
        return Promise.resolve(makeQueryResult([{id: MEAL_ID}]));
      }
      if (text.includes('from meal_recipes')) {
        return Promise.resolve(makeQueryResult([mealRecipeRow]));
      }
      if (text.includes('from meals')) {
        return Promise.resolve(makeQueryResult([mealRow]));
      }
      if (text.includes('from recipes r')) {
        return Promise.resolve(makeQueryResult([accessibleRecipeRow]));
      }
      if (text.includes('share_grants')) {
        return Promise.resolve(emptyShareGrant);
      }
      return Promise.resolve(makeQueryResult([]));
    });
  };

  type TxClientOptions = {failMemberInsert?: boolean};

  const makeTxClient = (options: TxClientOptions = {}): MockClient => {
    const query =
      jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();
    query.mockImplementation((text: string) => {
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('insert into meal_recipes')) {
        if (options.failMemberInsert) {
          return Promise.reject(new Error('member insert failed'));
        }
        return Promise.resolve(makeQueryResult([]));
      }
      if (
        text.includes('update meals') ||
        text.includes('delete from meal_recipes')
      ) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    return {query, release: mockRelease};
  };

  const calledSql = (client: MockClient): string[] =>
    client.query.mock.calls.map(([text]) => text);

  beforeEach(() => {
    mockConnect.mockReset();
    mockPoolQuery.mockReset();
    mockRelease.mockReset();
  });

  test('commits update, delete, and inserts on one client', async () => {
    installPoolRouting();
    const client = makeTxClient();
    mockConnect.mockResolvedValue(client);
    const result = await replaceMeal(MEAL_ID, USER_ID, mealInput);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.meal.id).toBe(MEAL_ID);
    const sql = calledSql(client);
    expect(sql[0]).toBe('BEGIN');
    expect(sql[sql.length - 1]).toBe('COMMIT');
    expect(sql).not.toContain('ROLLBACK');
    const updateAt = sql.findIndex(text => text.includes('update meals'));
    const deleteAt = sql.findIndex(text =>
      text.includes('delete from meal_recipes'),
    );
    const insertAt = sql.findIndex(text =>
      text.includes('insert into meal_recipes'),
    );
    expect(updateAt).toBeGreaterThan(-1);
    expect(deleteAt).toBeGreaterThan(updateAt);
    expect(insertAt).toBeGreaterThan(deleteAt);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    // No replacement write escaped the transaction onto the shared pool.
    expect(
      mockPoolQuery.mock.calls.some(
        ([text]) =>
          text.includes('update meals') ||
          text.includes('delete from meal_recipes') ||
          text.includes('insert into meal_recipes'),
      ),
    ).toBe(false);
  });

  test('rolls back when a member insert fails after the delete', async () => {
    installPoolRouting();
    const client = makeTxClient({failMemberInsert: true});
    mockConnect.mockResolvedValue(client);
    await expect(replaceMeal(MEAL_ID, USER_ID, mealInput)).rejects.toThrow(
      'member insert failed',
    );
    const sql = calledSql(client);
    expect(sql[0]).toBe('BEGIN');
    const updateAt = sql.findIndex(text => text.includes('update meals'));
    const deleteAt = sql.findIndex(text =>
      text.includes('delete from meal_recipes'),
    );
    const insertAt = sql.findIndex(text =>
      text.includes('insert into meal_recipes'),
    );
    expect(updateAt).toBeGreaterThan(-1);
    expect(deleteAt).toBeGreaterThan(updateAt);
    expect(insertAt).toBeGreaterThan(deleteAt);
    expect(sql).toContain('ROLLBACK');
    expect(sql).not.toContain('COMMIT');
    expect(mockRelease).toHaveBeenCalledTimes(1);
    // The post-save detail load is never attempted after the rollback.
    expect(
      mockPoolQuery.mock.calls.some(([text]) =>
        text.includes('from meal_recipes'),
      ),
    ).toBe(false);
  });

  test('does not open a transaction when the meal is missing', async () => {
    mockPoolQuery.mockResolvedValue(makeQueryResult([]));
    const result = await replaceMeal(MEAL_ID, USER_ID, mealInput);
    expect(result).toEqual({error: 'Meal not found', status: 404});
    expect(mockConnect).not.toHaveBeenCalled();
  });
});
