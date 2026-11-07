import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const candidateVersionRow = (
  overrides: Parameters<typeof makeVersionDetailRow>[0] = {},
) =>
  makeVersionDetailRow({
    version_id: 'version-uuid-2',
    version_number: 2,
    active_version_id: 'version-uuid-1',
    active_version_number: 1,
    cook_log_count: 1,
    child_version_count: 0,
    ...overrides,
  });

describe('POST /recipes/:id/versions/:versionId/activate', () => {
  test('returns 200 with updated active recipe', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([candidateVersionRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.versionId).toBe('version-uuid-1');
  });

  test('updates the lineage slug to the activated version title', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const executed: {sql: string; params?: unknown[]}[] = [];
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      executed.push({sql, params});
      if (sql.includes('cook_log_count')) {
        return Promise.resolve(
          makeQueryResult([candidateVersionRow({title: 'Renamed Draft'})]),
        );
      }
      if (sql.includes('from recipes r')) {
        return Promise.resolve(makeQueryResult([makeRecipeDetailRow()]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate')
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(200);
    const slugUpdate = executed.find(call => call.sql.includes('set slug'));
    expect(slugUpdate?.params).toEqual(['recipe-uuid-1', 'renamed-draft']);
  });

  test('returns 404 when version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/missing-version/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).post(
      '/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate',
    );
    expect(res.status).toBe(401);
  });

  test('returns 409 when version is draft with no cook logs', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeVersionDetailRow({
          id: 'version-uuid-2',
          version_id: 'version-uuid-2',
          version_number: 2,
          active_version_id: 'version-uuid-1',
          active_version_number: 1,
          cook_log_count: 0,
        }),
      ]),
    );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'Draft versions cannot be activated directly \u2014 mark the recipe Perfected first, or log a cook against the version',
    );
  });

  test('activates a draft version of a Perfected recipe with no cook logs (#417)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          makeVersionDetailRow({
            version_id: 'version-uuid-2',
            version_number: 2,
            active_version_id: 'version-uuid-1',
            active_version_number: 1,
            cook_log_count: 0,
            status: 'perfected',
          }),
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
  });

  test('activates a candidate version of a Perfected recipe (#417)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([candidateVersionRow({status: 'perfected'})]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
  });

  test('re-activates a previously active (archived) version (#417)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          makeVersionDetailRow({
            version_id: 'version-uuid-1',
            version_number: 1,
            active_version_id: 'version-uuid-2',
            active_version_number: 2,
            cook_log_count: 0,
          }),
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
  });

  test('returns 409 when the version is already active', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeVersionDetailRow({
          version_id: 'version-uuid-1',
          version_number: 1,
          active_version_id: 'version-uuid-1',
          active_version_number: 1,
          cook_log_count: 3,
        }),
      ]),
    );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('This version is already active');
  });

  test('returns 409 when the recipe is abandoned', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([candidateVersionRow({status: 'abandoned'})]),
    );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'Recipe cannot be modified in its current status',
    );
  });

  test('returns 404 when recipe detail is missing after activation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([candidateVersionRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/activate')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});
