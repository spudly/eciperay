import {jest} from '@jest/globals';
import type {QueryResult, QueryResultRow} from 'pg';

import type {query} from '../db/query.js';

/**
 * Returns a Jest mock pre-typed as the `query` function. Pass to
 * `createApp({query: createMockQuery()})` or directly to functions that accept
 * a queryFn parameter.
 */
export const createMockQuery = () => {
  const mock = jest.fn<() => Promise<QueryResult<QueryResultRow>>>();
  return mock as unknown as jest.MockedFunction<typeof query>;
};
