import {jest} from '@jest/globals';
import type {QueryResult} from 'pg';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';

type MockClient = {
  query: jest.Mock<(text: string, params?: unknown[]) => Promise<QueryResult>>;
  release: jest.Mock<() => void>;
};

const mockRelease = jest.fn<() => void>();
const mockConnect = jest.fn<() => Promise<MockClient>>();
const mockPoolQuery =
  jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();

// saveRecipeMetadata only opens a real transaction for the default pool
// query (runTransactional passes injected query functions straight
// through), so the pool is mocked and the save is called with the default
// query — the same pattern as saveMealPlan.test.ts. A test through an
// injected mock query cannot detect loss of the transaction wrapper:
// every statement would succeed or fail on the shared query instead of
// committing or rolling back together on one client.
jest.unstable_mockModule('../db/pool.js', () => ({
  default: {connect: mockConnect, query: mockPoolQuery},
}));

const {saveRecipeMetadata} = await import('./saveRecipeMetadata.js');
const {query: defaultQuery} = await import('../db/query.js');

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
