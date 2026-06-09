import {jest} from '@jest/globals';
import type {QueryResult} from 'pg';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

const mockRelease = jest.fn<() => void>();
const mockConnect = jest.fn<() => Promise<MockClient>>();

type MockClient = {
  query: jest.Mock<(text: string, params?: unknown[]) => Promise<QueryResult>>;
  release: jest.Mock<() => void>;
};

jest.unstable_mockModule('./pool.js', () => ({
  default: {connect: mockConnect},
}));

const {runTransactional, withTransaction} =
  await import('./withTransaction.js');
const {query: defaultQuery} = await import('./query.js');

const makeClient = (): MockClient => {
  const query =
    jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();
  query
    .mockResolvedValueOnce(makeQueryResult([]))
    .mockResolvedValueOnce(makeQueryResult([{id: 1}]))
    .mockResolvedValueOnce(makeQueryResult([]));
  return {query, release: mockRelease};
};

describe('withTransaction', () => {
  beforeEach(() => {
    mockConnect.mockReset();
    mockRelease.mockReset();
  });

  test('commits when callback succeeds', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client);
    const result = await withTransaction(async q => {
      await q('select 1');
      await q('select 2', ['x']);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(client.query).toHaveBeenCalledWith('BEGIN', undefined);
    expect(client.query).toHaveBeenCalledWith('COMMIT', undefined);
    expect(mockRelease).toHaveBeenCalled();
  });

  test('rolls back when callback throws', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client);
    await expect(
      withTransaction(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK', undefined);
    expect(mockRelease).toHaveBeenCalled();
  });

  test('propagates error when release fails after success', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client);
    mockRelease.mockImplementation(() => {
      throw new Error('release failed');
    });
    await expect(withTransaction(async () => 'ok')).rejects.toThrow(
      'release failed',
    );
  });

  test('rolls back when begin fails', async () => {
    const query =
      jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();
    query.mockImplementation((text: string) => {
      if (text === 'BEGIN') {
        return Promise.reject(new Error('begin failed'));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const client = {query, release: mockRelease};
    mockConnect.mockResolvedValue(client);
    await expect(withTransaction(async () => 'ok')).rejects.toThrow(
      'begin failed',
    );
    expect(query).toHaveBeenCalledWith('ROLLBACK', undefined);
    expect(mockRelease).toHaveBeenCalled();
  });

  test('rolls back when commit fails', async () => {
    const query =
      jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();
    query.mockImplementation((text: string) => {
      if (text === 'COMMIT') {
        return Promise.reject(new Error('commit failed'));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const client = {query, release: mockRelease};
    mockConnect.mockResolvedValue(client);
    await expect(withTransaction(async () => 'ok')).rejects.toThrow(
      'commit failed',
    );
    expect(query).toHaveBeenCalledWith('ROLLBACK', undefined);
    expect(mockRelease).toHaveBeenCalled();
  });

  test('releases client when rollback fails', async () => {
    const query =
      jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();
    query.mockImplementation((text: string) => {
      if (text === 'ROLLBACK') {
        return Promise.reject(new Error('rollback failed'));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const client = {query, release: mockRelease};
    mockConnect.mockResolvedValue(client);
    await expect(
      withTransaction(async () => {
        throw new Error('callback failed');
      }),
    ).rejects.toThrow('callback failed');
    expect(mockRelease).toHaveBeenCalled();
  });

  test('rolls back and rethrows non-Error values', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client);
    await expect(
      withTransaction(async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- verifies non-Error values propagate
        throw 'boom';
      }),
    ).rejects.toBe('boom');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK', undefined);
    expect(mockRelease).toHaveBeenCalled();
  });
});

describe('runTransactional', () => {
  test('runs callback directly when queryFn is not the default pool query', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([{ok: true}]));
    const result = await runTransactional(mockQuery, async q => q('select 1'));
    expect(result.rows[0]).toEqual({ok: true});
  });

  test('uses withTransaction when queryFn is the default pool query', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client);
    const result = await runTransactional(defaultQuery, async q =>
      q('select 1'),
    );
    expect(result.rows[0]).toEqual({id: 1});
  });
});
