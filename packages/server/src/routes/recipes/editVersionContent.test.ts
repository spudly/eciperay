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
  matchingRevision?: boolean;
  inTxTargetRow?: ReturnType<typeof makeVersionDetailRow>;
  inTxRecipeRow?: ReturnType<typeof makeRecipeDetailRow>;
  inTxRecipeMissing?: boolean;
  inTxTargetMissing?: boolean;
  insertReturnsNoId?: boolean;
  updateReturnsNoRow?: boolean;
  reopenSucceeds?: boolean;
  finalFetchMissing?: boolean;
};

/**
 * Routes the handler's queries by SQL shape, like putVersion.test.ts: the
 * version-detail fetches are told apart by the version id in their params, and
 * every executed statement is recorded for assertions.
 */
const mockEditFlow = (options: MockOptions = {}) => {
  const executed: string[] = [];
  let versionFetches = 0;
  let recipeFetches = 0;
  mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
    executed.push(sql);
    if (sql.includes('and status = $4')) {
      return Promise.resolve(
        makeQueryResult(options.reopenSucceeds ? [{id: 'recipe-uuid-1'}] : []),
      );
    }
    if (sql.includes('and content_revision')) {
      return Promise.resolve(
        makeQueryResult(
          options.matchingRevision ? [{id: 'recipe-uuid-1'}] : [],
        ),
      );
    }
    if (sql.includes('cook_log_count')) {
      versionFetches += 1;
      if (options.finalFetchMissing && versionFetches > 2) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (options.inTxTargetMissing && versionFetches > 1) {
        return Promise.resolve(makeQueryResult([]));
      }
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
      if (options.inTxTargetRow && versionFetches > 1) {
        return Promise.resolve(makeQueryResult([options.inTxTargetRow]));
      }
      const row =
        options.targetRow ??
        (versionId === 'version-uuid-2'
          ? draftVersionRow()
          : activeVersionRow());
      return Promise.resolve(makeQueryResult([row]));
    }
    if (sql.includes('from recipes r')) {
      recipeFetches += 1;
      if (options.recipeRow === null) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (recipeFetches > 1 && options.inTxRecipeMissing) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (recipeFetches > 1 && options.inTxRecipeRow) {
        return Promise.resolve(makeQueryResult([options.inTxRecipeRow]));
      }
      return Promise.resolve(
        makeQueryResult([options.recipeRow ?? makeRecipeDetailRow()]),
      );
    }
    if (sql.includes('max(version_number)')) {
      return Promise.resolve(makeQueryResult([{max: 2}]));
    }
    if (sql.includes('insert into recipe_versions')) {
      return Promise.resolve(
        makeQueryResult(
          options.insertReturnsNoId ? [] : [{id: 'version-uuid-3'}],
        ),
      );
    }
    if (sql.includes('update recipe_versions')) {
      if (options.updateReturnsNoRow) {
        return Promise.resolve({...makeQueryResult([]), rowCount: 0});
      }
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

  test('returns 409 when branching from the active version of an abandoned recipe', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({recipeRow: makeRecipeDetailRow({status: 'abandoned'})});

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

  test('returns 409 and writes nothing when expectedContentRevision is stale', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const executed = mockEditFlow();

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody({expectedContentRevision: 99}));

    expect(res.status).toBe(409);
    expect(executed.some(sql => sql.includes('update recipe_versions'))).toBe(
      false,
    );
    expect(
      executed.some(sql => sql.includes('insert into recipe_versions')),
    ).toBe(false);
  });

  test('proceeds when expectedContentRevision still matches', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({matchingRevision: true});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody({expectedContentRevision: 7}));

    expect(res.status).toBe(200);
  });

  test('returns 409 when a cook log lands between the first read and the write', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const executed = mockEditFlow({
      inTxTargetRow: draftVersionRow({cook_log_count: 1}),
    });

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(409);
    expect(executed.some(sql => sql.includes('update recipe_versions'))).toBe(
      false,
    );
  });

  test('branches with null optional fields stored as nulls', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow();

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(
        editBody({description: null, prepTimeMin: null, cookTimeMin: null}),
      );

    expect(res.status).toBe(201);
    const insert = mockQuery.mock.calls.find(([sql]) =>
      String(sql).includes('insert into recipe_versions'),
    );
    const insertParams = insert?.[1] as unknown[];
    // description, prepTimeMin, cookTimeMin land in the insert as nulls.
    expect(insertParams[3]).toBeNull();
    expect(insertParams[5]).toBeNull();
    expect(insertParams[6]).toBeNull();
  });

  test('edits a draft in place with null optional fields stored as nulls', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow();

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(
        editBody({description: null, prepTimeMin: null, cookTimeMin: null}),
      );

    expect(res.status).toBe(200);
    const update = mockQuery.mock.calls.find(([sql]) =>
      String(sql).includes('update recipe_versions'),
    );
    const updateParams = update?.[1] as unknown[];
    // description, prepTimeMin, cookTimeMin land in the update as nulls.
    expect(updateParams[2]).toBeNull();
    expect(updateParams[4]).toBeNull();
    expect(updateParams[5]).toBeNull();
  });

  test('applies a lineage status change sent with an in-place edit', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const executed = mockEditFlow();

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody({status: 'evolving'}));

    expect(res.status).toBe(200);
    expect(
      executed.some(
        sql => sql === 'update recipes set status = $2 where id = $1',
      ),
    ).toBe(true);
  });

  test('returns 409 when the recipe vanishes inside the transaction', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({inTxRecipeMissing: true});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Recipe changed since it was read');
  });

  test('returns 409 when the named version vanishes inside the transaction', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({inTxTargetMissing: true});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Recipe changed since it was read');
  });

  test('returns 409 when a different version becomes active inside the transaction', async () => {
    nockSupabaseGetUser('user-uuid-1');
    // A concurrent activation lands between the first read and the
    // write: the named version (version-uuid-2) is still the row the
    // version query returns, but the recipe row now names it as the
    // active version, so the in-transaction re-read sees this edit
    // would branch when the pre-transaction read said in-place.
    mockEditFlow({
      inTxTargetRow: draftVersionRow({
        active_version_id: 'version-uuid-2',
        active_version_number: 2,
      }),
      inTxRecipeRow: makeRecipeDetailRow({
        version_id: 'version-uuid-2',
        active_version_id: 'version-uuid-2',
        version_number: 2,
      }),
    });

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('The active version changed');
  });

  test('returns 409 when the lineage becomes uneditable inside the transaction', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({
      recipeRow: makeRecipeDetailRow({status: 'perfected'}),
      inTxRecipeRow: makeRecipeDetailRow({status: 'abandoned'}),
    });

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(409);
  });

  test('branches from a perfected recipe and reopens the lineage', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const executed = mockEditFlow({
      recipeRow: makeRecipeDetailRow({status: 'perfected'}),
      reopenSucceeds: true,
      branchActive: false,
    });

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(201);
    expect(executed.some(sql => sql.includes('and status = $4'))).toBe(true);
  });

  test('returns 409 when reopening a perfected lineage matches no row', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({recipeRow: makeRecipeDetailRow({status: 'perfected'})});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(409);
    expect(res.body.error).toContain(
      'Recipe status changed while creating a draft version',
    );
  });

  test('returns 500 when branching creates no version row', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({insertReturnsNoId: true});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(500);
  });

  test('returns 500 when the in-place update matches no row', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({updateReturnsNoRow: true});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(500);
  });

  test('returns 500 when the edited version cannot be re-read', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockEditFlow({finalFetchMissing: true});

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-2/edit')
      .set('Authorization', 'Bearer <redacted>')
      .send(editBody());

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch edited version');
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
