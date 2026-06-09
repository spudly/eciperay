import type {QueryResult, QueryResultRow} from 'pg';

import pool from './pool.js';
import {query as defaultQuery} from './query.js';

export type TransactionQueryFn = typeof defaultQuery;

type PoolClient = {
  query: <R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ) => Promise<QueryResult<R>>;
  release: () => void;
};

const makeTxQuery = (client: PoolClient): TransactionQueryFn => {
  return <R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<R>> => client.query<R>(text, params);
};

export const withTransaction = async <T>(
  fn: (query: TransactionQueryFn) => Promise<T>,
): Promise<T> => {
  const client = (await pool.connect()) as PoolClient;
  const txQuery = makeTxQuery(client);
  try {
    await txQuery('BEGIN');
    const result = await fn(txQuery);
    await txQuery('COMMIT');
    client.release();
    return result;
  } catch (error) {
    try {
      await txQuery('ROLLBACK');
    } catch {
      /* rollback is best-effort when the transaction is already broken */
    }
    client.release();
    throw error;
  }
};

export const runTransactional = async <T>(
  queryFn: TransactionQueryFn,
  fn: (query: TransactionQueryFn) => Promise<T>,
): Promise<T> => {
  if (queryFn !== defaultQuery) {
    return fn(queryFn);
  }
  return withTransaction(fn);
};
