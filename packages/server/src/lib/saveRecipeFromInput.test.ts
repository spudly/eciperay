import {makeRecipeInput, makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  RecipeNotFoundError,
  saveRecipeFromInput,
} from './saveRecipeFromInput.js';

describe('saveRecipeFromInput', () => {
  test('creates a recipe and returns mapped detail', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
    const result = await saveRecipeFromInput(
      {userId: 'user-uuid-1', input: makeRecipeInput()},
      mockQuery,
    );
    expect(result).toEqual(makeRecipeDetail());
  });

  test('updates an existing recipe and replaces children', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
    const result = await saveRecipeFromInput(
      {
        userId: 'user-uuid-1',
        input: makeRecipeInput(),
        recipeId: 'recipe-uuid-1',
      },
      mockQuery,
    );
    expect(result.title).toBe('Test Recipe');
  });

  test('throws RecipeNotFoundError when update misses', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});
    await expect(
      saveRecipeFromInput(
        {userId: 'user-uuid-1', input: makeRecipeInput(), recipeId: 'missing'},
        mockQuery,
      ),
    ).rejects.toThrow(RecipeNotFoundError);
  });

  test('throws RecipeNotFoundError when detail fetch returns no row', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([]));
    await expect(
      saveRecipeFromInput(
        {userId: 'user-uuid-1', input: makeRecipeInput()},
        mockQuery,
      ),
    ).rejects.toThrow(RecipeNotFoundError);
  });
});
