import type {QueryResult, QueryResultRow} from 'pg';

/**
 * Wraps an array of rows in a pg.QueryResult shape. Use to set mock return
 * values: `mockQuery.mockResolvedValue(makeQueryResult([makeUser()]))`.
 */
export const makeQueryResult = <T extends QueryResultRow>(
  rows: T[],
): QueryResult<T> => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});
