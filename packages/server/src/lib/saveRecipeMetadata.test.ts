import {jest} from '@jest/globals';
import type {QueryResult} from 'pg';

import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

type MockClient = {
  query: jest.Mock<(text: string, params?: unknown[]) => Promise<QueryResult>>;
  release: jest.Mock<() => void>;
};

const mockRelease = jest.fn<() => void>();
const mockConnect = jest.fn<() => Promise<MockClient>>();
const mockPoolQuery =
  jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();

// #460 tranche 1: the former saveRecipeMetadata.transaction.test.ts
// is merged below. saveRecipeMetadata only opens a real transaction
// for the default pool query (runTransactional passes injected query
// functions straight through), so the pool is mocked and those tests
// call the save with the default query — the same pattern as
// saveMealPlan.test.ts.
jest.unstable_mockModule('../db/pool.js', () => ({
  default: {connect: mockConnect, query: mockPoolQuery},
}));

const {saveRecipeMetadata} = await import('./saveRecipeMetadata.js');
const {RecipeNotFoundError} = await import('./saveRecipeFromInput.js');
const {query: defaultQuery} = await import('../db/query.js');

const mockQuery = createMockQuery();

describe('saveRecipeMetadata', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('updates metadata and returns refreshed recipe detail', async () => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('update recipe_versions')) {
        return Promise.resolve(makeQueryResult([{id: 'version-uuid-1'}]));
      }
      if (sql.includes('delete from recipe_version_tags')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('insert into recipe_version_tags')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('from recipes r')) {
        return Promise.resolve(
          makeQueryResult([makeRecipeDetailRow({title: 'Updated'})]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const detail = await saveRecipeMetadata(
      {
        userId: 'user-uuid-1',
        recipeId: 'recipe-uuid-1',
        versionId: 'version-uuid-1',
        input: {
          title: 'Updated',
          description: 'A test recipe',
          servings: 4,
          prepTimeMin: 15,
          cookTimeMin: 30,
          imageUrl: null,
          sourceUrl: null,
          tagIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
        },
      },
      mockQuery,
    );

    expect(detail.title).toBe('Updated');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('status'), [
      'recipe-uuid-1',
      'idea',
    ]);
  });

  // Regression for #394 (b): a metadata-only edit changes what meal
  // detail reads for each member meal, so the save must advance those
  // meals' updated_at (their ETag token) as part of the save itself —
  // after the version update and before the detail read that runs after
  // the transaction.
  test('advances member meals updated_at inside the save, before the detail read', async () => {
    const calls: string[] = [];
    mockQuery.mockImplementation(((sql: string) => {
      calls.push(sql);
      if (sql.includes('update recipe_versions')) {
        return Promise.resolve(makeQueryResult([{id: 'version-uuid-1'}]));
      }
      if (sql.includes('from recipes r')) {
        return Promise.resolve(
          makeQueryResult([makeRecipeDetailRow({title: 'Updated'})]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const detail = await saveRecipeMetadata(
      {
        userId: 'user-uuid-1',
        recipeId: 'recipe-uuid-1',
        versionId: 'version-uuid-1',
        input: {
          title: 'Updated',
          description: 'A test recipe',
          servings: 4,
          prepTimeMin: 15,
          cookTimeMin: 30,
          imageUrl: null,
          sourceUrl: null,
          tagIds: [],
        },
      },
      mockQuery,
    );

    expect(detail.title).toBe('Updated');
    const touchCall = mockQuery.mock.calls.find(([sql]) =>
      (sql as unknown as string).includes('update meals'),
    );
    expect(touchCall).toBeDefined();
    expect(touchCall?.[0]).toContain(
      'select meal_id from meal_recipes where recipe_id = $1',
    );
    expect(touchCall?.[1]).toEqual(['recipe-uuid-1']);

    const versionIdx = calls.findIndex(sql =>
      sql.includes('update recipe_versions'),
    );
    const touchIdx = calls.findIndex(sql => sql.includes('update meals'));
    const detailIdx = calls.findIndex(sql => sql.includes('from recipes r'));
    expect(versionIdx).toBeGreaterThanOrEqual(0);
    expect(touchIdx).toBeGreaterThan(versionIdx);
    expect(detailIdx).toBeGreaterThan(touchIdx);
  });

  // The meal-token bump shares the save's transaction, so when it fails
  // the whole save fails and no refreshed detail is read or returned —
  // the metadata change and the bump commit or roll back together.
  test('fails the save without reading detail when the meal bump fails', async () => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('update recipe_versions')) {
        return Promise.resolve(makeQueryResult([{id: 'version-uuid-1'}]));
      }
      if (sql.includes('update meals')) {
        return Promise.reject(new Error('meal bump failed'));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    await expect(
      saveRecipeMetadata(
        {
          userId: 'user-uuid-1',
          recipeId: 'recipe-uuid-1',
          versionId: 'version-uuid-1',
          input: {
            title: 'Updated',
            description: null,
            servings: 4,
            prepTimeMin: null,
            cookTimeMin: null,
            imageUrl: null,
            sourceUrl: null,
            tagIds: [],
          },
        },
        mockQuery,
      ),
    ).rejects.toThrow('meal bump failed');

    const detailCall = mockQuery.mock.calls.find(([sql]) =>
      (sql as unknown as string).includes('from recipes r'),
    );
    expect(detailCall).toBeUndefined();
  });

  test('throws when refreshed recipe is missing', async () => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('update recipe_versions')) {
        return Promise.resolve(makeQueryResult([{id: 'version-uuid-1'}]));
      }
      if (sql.includes('delete from recipe_version_tags')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('insert into recipe_version_tags')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('from recipes r')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    await expect(
      saveRecipeMetadata(
        {
          userId: 'user-uuid-1',
          recipeId: 'recipe-uuid-1',
          versionId: 'version-uuid-1',
          input: {
            title: 'Updated',
            description: null,
            servings: 4,
            prepTimeMin: null,
            cookTimeMin: null,
            imageUrl: null,
            sourceUrl: null,
            tagIds: [],
          },
        },
        mockQuery,
      ),
    ).rejects.toBeInstanceOf(RecipeNotFoundError);
  });
});

// Former saveRecipeMetadata.transaction.test.ts.
const opts = {
  userId: 'user-uuid-1',
  recipeId: 'recipe-uuid-1',
  versionId: 'version-uuid-1',
  input: {
    title: 'Updated',
    description: 'A test recipe',
    servings: 4,
    prepTimeMin: 15,
    cookTimeMin: 30,
    imageUrl: null,
    sourceUrl: null,
    tagIds: [],
  },
};

const makeTxClient = (options: {failMealBump?: boolean} = {}): MockClient => {
  const query =
    jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();
  query.mockImplementation((text: string) => {
    if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
      return Promise.resolve(makeQueryResult([]));
    }
    if (text.includes('update recipe_versions')) {
      return Promise.resolve(makeQueryResult([{id: 'version-uuid-1'}]));
    }
    if (text.includes('update meals')) {
      if (options.failMealBump) {
        return Promise.reject(new Error('meal bump failed'));
      }
      return Promise.resolve(makeQueryResult([]));
    }
    return Promise.resolve(makeQueryResult([]));
  });
  return {query, release: mockRelease};
};

const calledSql = (client: MockClient): string[] =>
  client.query.mock.calls.map(([text]) => text);

describe('saveRecipeMetadata transaction', () => {
  beforeEach(() => {
    mockConnect.mockReset();
    mockPoolQuery.mockReset();
    mockRelease.mockReset();
    // The post-transaction detail read runs on the shared pool query.
    mockPoolQuery.mockImplementation((text: string) => {
      if (text.includes('from recipes r')) {
        return Promise.resolve(
          makeQueryResult([makeRecipeDetailRow({title: 'Updated'})]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    });
  });

  test('commits the metadata save and the meal-token bump on one client', async () => {
    const client = makeTxClient();
    mockConnect.mockResolvedValue(client);

    const detail = await saveRecipeMetadata(opts, defaultQuery);

    expect(detail.title).toBe('Updated');
    const sql = calledSql(client);
    expect(sql[0]).toBe('BEGIN');
    expect(sql[sql.length - 1]).toBe('COMMIT');
    expect(sql).not.toContain('ROLLBACK');
    expect(sql.some(text => text.includes('update meals'))).toBe(true);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    // No write escaped the transaction onto the shared pool.
    expect(
      mockPoolQuery.mock.calls.some(
        ([text]) =>
          text.includes('update meals') ||
          text.includes('update recipe_versions') ||
          text.includes('update recipes set'),
      ),
    ).toBe(false);
  });

  // Regression for #394: the meal-token bump shares the save's
  // transaction, so its failure must roll the metadata writes back. If
  // the runTransactional wrapper were removed, the statements would run
  // on the shared pool query (which resolves them all here), the save
  // would succeed, and no ROLLBACK would ever be issued.
  test('rolls back the metadata save when the meal-token bump fails', async () => {
    const client = makeTxClient({failMealBump: true});
    mockConnect.mockResolvedValue(client);

    await expect(saveRecipeMetadata(opts, defaultQuery)).rejects.toThrow(
      'meal bump failed',
    );

    const sql = calledSql(client);
    expect(sql[0]).toBe('BEGIN');
    expect(sql).toContain('ROLLBACK');
    expect(sql).not.toContain('COMMIT');
    expect(sql.some(text => text.includes('update recipe_versions'))).toBe(
      true,
    );
    expect(sql.some(text => text.includes('update meals'))).toBe(true);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    // Nothing was written through the shared pool instead.
    expect(
      mockPoolQuery.mock.calls.some(
        ([text]) =>
          text.includes('update meals') ||
          text.includes('update recipe_versions') ||
          text.includes('update recipes set'),
      ),
    ).toBe(false);
  });
});
