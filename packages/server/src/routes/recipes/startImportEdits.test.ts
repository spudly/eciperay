import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const mockStartImportEditsFlow = (
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
          created_via: 'import_review',
          change_summary: 'Import review edits',
          active_version_id: 'version-uuid-1',
          active_version_number: 1,
          cook_log_count: 0,
          derived_from_version_id: 'version-uuid-1',
        }),
      ]),
    );
};

describe('POST /recipes/:id/import/start-edits', () => {
  test('returns 201 with import review draft version', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockStartImportEditsFlow();

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/import/start-edits')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
    expect(res.body.versionNumber).toBe(2);
    expect(res.body.createdVia).toBe('import_review');
    expect(res.body.changeSummary).toBe('Import review edits');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(app)
      .post('/api/recipes/missing-id/import/start-edits')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 409 when recipe is perfected', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        makeRecipeDetailRow({
          lifecycleStatus: 'perfected',
          status: 'perfected',
        }),
      ]),
    );

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/import/start-edits')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });

  test('returns 500 when version insert fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          makeRecipeDetailRow({lifecycleStatus: 'idea', status: 'idea'}),
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/import/start-edits')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
  });

  test('returns 500 when created version cannot be loaded', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          makeRecipeDetailRow({lifecycleStatus: 'idea', status: 'idea'}),
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-2'}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/import/start-edits')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch created version');
  });
});
