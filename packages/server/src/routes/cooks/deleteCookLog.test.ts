import request from 'supertest';

import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const deletePath =
  '/api/recipes/recipe-uuid-1/versions/version-uuid-1/cooks/cook-log-uuid-1';

describe('DELETE /recipes/:id/versions/:versionId/cooks/:cookLogId', () => {
  test('returns 204 when the user deletes their own cook log', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce({...makeQueryResult([{}]), rowCount: 1});

    const res = await request(getApp())
      .delete(deletePath)
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(204);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('delete from cook_logs'),
      ['cook-log-uuid-1', 'version-uuid-1', 'user-uuid-1'],
    );
  });

  test('returns 404 when the cook log is missing or belongs to another user', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});

    const res = await request(getApp())
      .delete(deletePath)
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Cook log not found');
  });

  test('returns 404 when the version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .delete(deletePath)
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).delete(deletePath);
    expect(res.status).toBe(401);
  });
});
