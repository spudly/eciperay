import type {QueryResult, QueryResultRow} from 'pg';

import pool from './pool.js';

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> => pool.query<T>(text, params);
