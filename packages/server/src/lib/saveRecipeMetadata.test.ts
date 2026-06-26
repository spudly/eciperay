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
