import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const editBody = (overrides: Record<string, unknown> = {}) => ({
  title: 'Edited Title',
  description: 'Edited description',
  servings: 4,
  prepTimeMin: 10,
  cookTimeMin: 20,
  imageUrl: null,
  sourceUrl: null,
  ingredients: [
    {
      sortOrder: 0,
      name: 'flour',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Mix well'}],
  tagIds: [],
  ...overrides,
});

const activeVersionRow = (
  overrides: Parameters<typeof makeVersionDetailRow>[0] = {},
) =>
  makeVersionDetailRow({
    id: 'version-uuid-1',
    version_id: 'version-uuid-1',
    version_number: 1,
    active_version_id: 'version-uuid-1',
    active_version_number: 1,
    ...overrides,
  });

const draftVersionRow = (
  overrides: Parameters<typeof makeVersionDetailRow>[0] = {},
) =>
  makeVersionDetailRow({
    id: 'version-uuid-2',
    version_id: 'version-uuid-2',
    version_number: 2,
    active_version_id: 'version-uuid-1',
    active_version_number: 1,
    cook_log_count: 0,
    child_version_count: 0,
    ...overrides,
  });

type MockOptions = {
  recipeRow?: ReturnType<typeof makeRecipeDetailRow> | null;
  targetRow?: ReturnType<typeof makeVersionDetailRow> | null;
  branchActive?: boolean;
};

/**
 * Routes the handler's queries by SQL shape, like putVersion.test.ts: the
 * version-detail fetches are told apart by the version id in their params, and
 * every executed statement is recorded for assertions.
 */
const mockEditFlow = (options: MockOptions = {}) => {
  const executed: string[] = [];
  mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
    executed.push(sql);
    if (sql.includes('cook_log_count')) {
      const versionId = params?.[0];
      if (versionId === 'version-uuid-3') {
        return Promise.resolve(
          makeQueryResult([
            makeVersionDetailRow({
              id: 'version-uuid-3',
              version_id: 'version-uuid-3',
              version_number: 3,
              title: 'Edited Title',
              active_version_id: options.branchActive
                ? 'version-uuid-3'
                : 'version-uuid-1',
              active_version_number: options.branchActive ? 3 : 1,
              cook_log_count: 0,
              child_version_count: 0,
              derived_from_version_id: 'version-uuid-1',
            }),
          ]),
        );
      }
      if (options.targetRow === null) {
        return Promise.resolve(makeQueryResult([]));
      }
      const row =
        options.targetRow ??
        (versionId === 'version-uuid-2'
          ? draftVersionRow()
          : activeVersionRow());
      return Promise.resolve(makeQueryResult([row]));
    }
    if (sql.includes('from recipes r')) {
      if (options.recipeRow === null) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(
        makeQueryResult([options.recipeRow ?? makeRecipeDetailRow()]),
      );
    }
    if (sql.includes('max(version_number)')) {
      return Promise.resolve(makeQueryResult([{max: 2}]));
    }
    if (sql.includes('insert into recipe_versions')) {
      return Promise.resolve(makeQueryResult([{id: 'version-uuid-3'}]));
    }
    if (sql.includes('update recipe_versions')) {
      return Promise.resolve({
        ...makeQueryResult([{id: 'version-uuid-2'}]),
        rowCount: 1,
      });
    }
    return Promise.resolve(makeQueryResult([]));
  }) as typeof mockQuery);
  return executed;
};

const SET_ACTIVE_SQL = 'update recipes set active_version_id';

describe('POST /recipes/:id/versions/:versionId/edit', () => {
  test('branches a new version from the active version without activating it', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const executed = mockEditFlow();

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('version-uuid-3');
    expect(res.body.versionNumber).toBe(3);
    expect(res.body.derivedRole).toBe('draft');
    expect(
      executed.some(sql => sql.includes('insert into recipe_versions')),
    ).toBe(true);
    expect(executed.some(sql => sql.includes(SET_ACTIVE_SQL))).toBe(false);
    // An unactivated branch must not move the lineage slug off the active
    // version's title; it catches up when the version is later activated.
    expect(executed.some(sql => sql.includes('set slug'))).toBe(false);
  });

  test('branches and activates in one request when activate is true', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const executed = mockEditFlow({branchActive: true});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody({activate: true}));

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('version-uuid-3');
    expect(res.body.derivedRole).toBe('active');
    expect(executed.some(sql => sql.includes(SET_ACTIVE_SQL))).toBe(true);
  });

  test('edits a draft version in place without creating a version', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const executed = mockEditFlow();

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('version-uuid-2');
    expect(
      executed.some(sql => sql.includes('insert into recipe_versions')),
    ).toBe(false);
    expect(executed.some(sql => sql.includes('update recipe_versions'))).toBe(
      true,
    );
    expect(executed.some(sql => sql.includes(SET_ACTIVE_SQL))).toBe(false);
    expect(executed.some(sql => sql.includes('set slug'))).toBe(false);
  });

  test('activates an edited draft when activate is true', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const executed = mockEditFlow();

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody({activate: true}));

    expect(res.status).toBe(200);
    expect(executed.some(sql => sql.includes(SET_ACTIVE_SQL))).toBe(true);
  });

  test('returns 409 for an archived version', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({
      recipeRow: makeRecipeDetailRow({
        version_id: 'version-uuid-2',
        active_version_id: 'version-uuid-2',
        version_number: 2,
      }),
      targetRow: activeVersionRow({
        active_version_id: 'version-uuid-2',
        active_version_number: 2,
      }),
    });

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(409);
  });

  test('returns 409 for a candidate version with cook logs', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({targetRow: draftVersionRow({cook_log_count: 1})});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(409);
  });

  test('returns 404 when the recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({recipeRow: null});

    const res = await request(getApp())
      .post('/api/recipes/missing-id/versions/version-uuid-1/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(404);
  });

  test('returns 404 when the named version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({targetRow: null});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-9/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(404);
  });

  test('returns 400 when the body is missing required fields', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow();

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send({title: 'Only a title'});

    expect(res.status).toBe(400);
  });
});
