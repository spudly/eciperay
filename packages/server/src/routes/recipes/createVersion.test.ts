import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const mockCreateVersionFlow = (
  lifecycleStatus: 'idea' | 'evolving' = 'idea',
) => {
  mockQuery
    .mockResolvedValueOnce(
      makeQueryResult([
        makeRecipeDetailRow({lifecycleStatus, status: lifecycleStatus}),
      ]),
    )
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

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
    expect(res.body.versionNumber).toBe(2);
    expect(res.body.derivedRole).toBe('draft');
  });

  test('promotes idea lineage to evolving', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockCreateVersionFlow('idea');

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(app)
      .post('/api/recipes/missing-id/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 409 when recipe is perfected', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeRecipeDetailRow({
          lifecycleStatus: 'perfected',
          status: 'perfected',
        }),
      ]),
    );

    const res = await request(app)
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

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/versions')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/recipes/recipe-uuid-1/versions');
    expect(res.status).toBe(401);
  });

  test('throws when version insert returns no id', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([]));

    await expect(
      request(app)
        .post('/api/recipes/recipe-uuid-1/versions')
        .set('Authorization', 'Bearer valid-token'),
    ).resolves.toMatchObject({status: 500});
  });
});
