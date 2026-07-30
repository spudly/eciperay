import {jest} from '@jest/globals';
import type {QueryResult, QueryResultRow} from 'pg';

import type {query} from '../db/query.js';

/**
 * Returns a Jest mock pre-typed as the `query` function. Use with
 * `lazyTestApp({query: createMockQuery()})` or pass directly as a queryFn.
 */
export const createMockQuery = () => {
  const mock = jest.fn<() => Promise<QueryResult<QueryResultRow>>>();
  return mock as unknown as jest.MockedFunction<typeof query>;
};
