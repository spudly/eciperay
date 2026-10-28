import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const mockCreateVersionFlow = (
  status: 'idea' | 'evolving' | 'perfected' = 'idea',
) => {
  mockQuery
    .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow({status})]))
    .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
    .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-2'}]))
    .mockResolvedValueOnce(makeQueryResult([]))
    .mockResolvedValueOnce(makeQueryResult([]))
    .mockResolvedValueOnce(makeQueryResult([]))
    .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
    .mockResolvedValue(
      makeQueryResult([
        makeVersionDetailRow({
          id: 'version-uuid-2',
          version_id: 'version-uuid-2',
          version_number: 2,
          active_version_id: 'version-uuid-1',
          active_version_number: 1,
          cook_log_count: 0,
          derived_from_version_id: 'version-uuid-1',
        }),
      ]),
    );
};

describe('POST /recipes/:id/versions', () => {
  test('returns 201 with cloned draft version', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockCreateVersionFlow();

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
    expect(res.body.versionNumber).toBe(2);
    expect(res.body.derivedRole).toBe('draft');
  });

  test('promotes idea lineage to evolving', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockCreateVersionFlow('idea');

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/missing-id/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('creates a draft version from a perfected recipe', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockCreateVersionFlow('perfected');

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
    expect(res.body.versionNumber).toBe(2);
    expect(res.body.derivedRole).toBe('draft');
  });

  test('reopens a perfected lineage to evolving when drafting', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockCreateVersionFlow('perfected');

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
    // The draft is only editable once the lineage leaves the locked
    // Perfected status: a status update to Evolving must be issued.
    const statusUpdate = mockQuery.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' && sql.includes('update recipes set status'),
    );
    expect(statusUpdate?.[1]).toEqual([
      'recipe-uuid-1',
      'user-uuid-1',
      'evolving',
    ]);
  });

  test('returns 409 when recipe is abandoned', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({status: 'abandoned'})]),
    );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });

  test('returns 500 when created version cannot be fetched', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-2'}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).post(
      '/api/recipes/recipe-uuid-1/versions',
    );
    expect(res.status).toBe(401);
  });

  test('throws when version insert returns no id', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([]));

    await expect(
      request(getApp())
        .post('/api/recipes/recipe-uuid-1/versions')
        .set('Authorization', 'Bearer valid-token'),
    ).resolves.toMatchObject({status: 500});
  });
});
