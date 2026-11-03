import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {saveRecipeMetadata} from './saveRecipeMetadata.js';
import {RecipeNotFoundError} from './saveRecipeFromInput.js';

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
