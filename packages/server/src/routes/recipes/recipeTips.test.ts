import request from 'supertest';

import {makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {mockBillingPlan} from '../../test/mockBilling.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

// #635 tranche 1: tips round-trip through the version write paths —
// create (POST /recipes), update (PUT version), and clone
// (POST /recipes/:id/versions) — plus the server-side caps. The mock
// query routes by SQL substring and captures the version insert/update
// params so the stored JSONB value can be asserted exactly.

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
    ...overrides,
  });

const findCallParams = (sqlFragment: string): unknown[] => {
  const call = mockQuery.mock.calls.find(([sql]) =>
    String(sql).includes(sqlFragment),
  );
  return (call?.[1] as unknown[]) ?? [];
};

describe('recipe tips (#635)', () => {
  describe('PUT /recipes/:id/versions/:versionId', () => {
    const mockPutVersionQueries = (
      finalTips: string[],
      captured: {updateParams?: unknown[]},
    ) => {
      let versionFetches = 0;
      mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
        if (sql.includes('cook_log_count')) {
          versionFetches += 1;
          return Promise.resolve(
            makeQueryResult([
              versionFetches > 1
                ? draftVersionRow({tips: finalTips})
                : draftVersionRow({tips: ['Stored tip']}),
            ]),
          );
        }
        if (sql.includes('update recipe_versions')) {
          captured.updateParams = params;
          return Promise.resolve({
            ...makeQueryResult([{id: 'version-uuid-2'}]),
            rowCount: 1,
          });
        }
        if (sql.includes('from recipes r')) {
          return Promise.resolve(makeQueryResult([makeRecipeDetailRow()]));
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery);
    };

    test('stores multiple tips in order, trimmed, blanks dropped, and returns them', async () => {
      nockSupabaseGetUser('user-uuid-1');
      const captured: {updateParams?: unknown[]} = {};
      mockPutVersionQueries(['Chill the dough', 'Rest 10 min'], captured);

      const res = await request(getApp())
        .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
        .set('Authorization', 'Bearer <redacted>')
        .send(
          makeRecipeInput({
            tips: ['  Chill the dough ', '', '   ', 'Rest 10 min'],
          }),
        );

      expect(res.status).toBe(200);
      expect(captured.updateParams?.[8]).toBe(
        '["Chill the dough","Rest 10 min"]',
      );
      expect(res.body.tips).toEqual(['Chill the dough', 'Rest 10 min']);
    });

    test('clears tips when an empty list is sent', async () => {
      nockSupabaseGetUser('user-uuid-1');
      const captured: {updateParams?: unknown[]} = {};
      mockPutVersionQueries([], captured);

      const res = await request(getApp())
        .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
        .set('Authorization', 'Bearer <redacted>')
        .send(makeRecipeInput({tips: []}));

      expect(res.status).toBe(200);
      expect(captured.updateParams?.[8]).toBe('[]');
      expect(res.body.tips).toEqual([]);
    });

    test('preserves stored tips when the field is omitted', async () => {
      nockSupabaseGetUser('user-uuid-1');
      const captured: {updateParams?: unknown[]} = {};
      mockPutVersionQueries(['Stored tip'], captured);

      const res = await request(getApp())
        .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
        .set('Authorization', 'Bearer <redacted>')
        .send(makeRecipeInput());

      expect(res.status).toBe(200);
      // Null param: the update's coalesce keeps the stored list.
      expect(captured.updateParams?.[8]).toBeNull();
      expect(res.body.tips).toEqual(['Stored tip']);
    });

    test('rejects more than 10 tips', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockQuery.mockResolvedValue(makeQueryResult([]));

      const res = await request(getApp())
        .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
        .set('Authorization', 'Bearer <redacted>')
        .send(
          makeRecipeInput({
            tips: Array.from({length: 11}, (_, i) => `Tip ${i + 1}`),
          }),
        );

      expect(res.status).toBe(400);
    });

    test('rejects a tip longer than 280 characters', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockQuery.mockResolvedValue(makeQueryResult([]));

      const res = await request(getApp())
        .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
        .set('Authorization', 'Bearer <redacted>')
        .send(makeRecipeInput({tips: ['x'.repeat(281)]}));

      expect(res.status).toBe(400);
    });
  });

  describe('POST /recipes/:id/versions (clone)', () => {
    test('carries the active version tips onto the cloned draft', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockQuery.mockImplementation(((sql: string) => {
        if (sql.includes('cook_log_count')) {
          return Promise.resolve(
            makeQueryResult([
              makeVersionDetailRow({
                id: 'version-uuid-2',
                version_id: 'version-uuid-2',
                version_number: 2,
                active_version_id: 'version-uuid-1',
                active_version_number: 1,
                tips: ['Tip A', 'Tip B'],
              }),
            ]),
          );
        }
        if (sql.includes('insert into recipe_versions')) {
          return Promise.resolve(makeQueryResult([{id: 'version-uuid-2'}]));
        }
        if (sql.includes('max(version_number)')) {
          return Promise.resolve(makeQueryResult([{max: 1}]));
        }
        if (sql.includes('from recipes r')) {
          return Promise.resolve(
            makeQueryResult([
              {...makeRecipeDetailRow(), tips: ['Tip A', 'Tip B']},
            ]),
          );
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery);

      const res = await request(getApp())
        .post('/api/recipes/recipe-uuid-1/versions')
        .set('Authorization', 'Bearer <redacted>');

      expect(res.status).toBe(201);
      expect(findCallParams('insert into recipe_versions')[9]).toBe(
        '["Tip A","Tip B"]',
      );
      expect(res.body.tips).toEqual(['Tip A', 'Tip B']);
    });
  });

  describe('POST /recipes/:id/import/start-edits', () => {
    test('carries the active version tips onto the import-review draft', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockQuery.mockImplementation(((sql: string) => {
        if (sql.includes('cook_log_count')) {
          return Promise.resolve(
            makeQueryResult([
              makeVersionDetailRow({
                id: 'version-uuid-2',
                version_id: 'version-uuid-2',
                version_number: 2,
                active_version_id: 'version-uuid-1',
                active_version_number: 1,
                tips: ['Tip A'],
              }),
            ]),
          );
        }
        if (sql.includes('insert into recipe_versions')) {
          return Promise.resolve(makeQueryResult([{id: 'version-uuid-2'}]));
        }
        if (sql.includes('max(version_number)')) {
          return Promise.resolve(makeQueryResult([{max: 1}]));
        }
        if (sql.includes('from recipes r')) {
          return Promise.resolve(
            makeQueryResult([{...makeRecipeDetailRow(), tips: ['Tip A']}]),
          );
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery);

      const res = await request(getApp())
        .post('/api/recipes/recipe-uuid-1/import/start-edits')
        .set('Authorization', 'Bearer <redacted>');

      expect(res.status).toBe(201);
      expect(findCallParams('insert into recipe_versions')[9]).toBe(
        '["Tip A"]',
      );
      expect(res.body.tips).toEqual(['Tip A']);
    });
  });

  describe('POST /recipes/:id/versions/:versionId/edit', () => {
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

    const mockBranchFlow = (finalTips: string[]) => {
      let versionFetches = 0;
      mockQuery.mockImplementation(((sql: string) => {
        if (sql.includes('cook_log_count')) {
          versionFetches += 1;
          return Promise.resolve(
            makeQueryResult([
              versionFetches > 2
                ? makeVersionDetailRow({
                    id: 'version-uuid-2',
                    version_id: 'version-uuid-2',
                    version_number: 2,
                    active_version_id: 'version-uuid-2',
                    active_version_number: 2,
                    tips: finalTips,
                  })
                : makeVersionDetailRow({tips: ['Stored tip']}),
            ]),
          );
        }
        if (sql.includes('insert into recipe_versions')) {
          return Promise.resolve(makeQueryResult([{id: 'version-uuid-2'}]));
        }
        if (sql.includes('max(version_number)')) {
          return Promise.resolve(makeQueryResult([{max: 1}]));
        }
        if (sql.includes('from recipes r')) {
          return Promise.resolve(makeQueryResult([makeRecipeDetailRow()]));
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery);
    };

    test('branching from the active version carries its tips when the edit omits them', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockBranchFlow(['Stored tip']);

      const res = await request(getApp())
        .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
        .set('Authorization', 'Bearer <redacted>')
        .send(editBody());

      expect(res.status).toBe(201);
      expect(findCallParams('insert into recipe_versions')[9]).toBe(
        '["Stored tip"]',
      );
      expect(res.body.tips).toEqual(['Stored tip']);
    });

    test('branching from the active version stores the edited tips', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockBranchFlow(['New tip']);

      const res = await request(getApp())
        .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/edit')
        .set('Authorization', 'Bearer <redacted>')
        .send(editBody({tips: ['New tip']}));

      expect(res.status).toBe(201);
      expect(findCallParams('insert into recipe_versions')[9]).toBe(
        '["New tip"]',
      );
      expect(res.body.tips).toEqual(['New tip']);
    });
  });

  describe('POST /recipes (create)', () => {
    test('persists the submitted tips on the first version', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockBillingPlan(mockQuery, 'plus');
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
        .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));

      const res = await request(getApp())
        .post('/api/recipes')
        .set('Authorization', 'Bearer <redacted>')
        .send(makeRecipeInput({tips: ['Season early', 'Taste as you go']}));

      expect(res.status).toBe(201);
      expect(findCallParams('insert into recipe_versions')[9]).toBe(
        '["Season early","Taste as you go"]',
      );
    });

    test('persists an empty list when tips are absent', async () => {
      nockSupabaseGetUser('user-uuid-1');
      mockBillingPlan(mockQuery, 'plus');
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
        .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));

      const res = await request(getApp())
        .post('/api/recipes')
        .set('Authorization', 'Bearer <redacted>')
        .send(makeRecipeInput());

      expect(res.status).toBe(201);
      expect(findCallParams('insert into recipe_versions')[9]).toBe('[]');
    });
  });
});
