import {makeRecipeInput, makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  RecipeNotFoundError,
  saveNewRecipeFromInput,
  saveRecipeFromInput,
} from './saveRecipeFromInput.js';

describe('saveRecipeFromInput', () => {
  test('creates a recipe and returns mapped detail', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-1'}]))
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
        ...makeQueryResult([{id: 'version-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
    const result = await saveRecipeFromInput(
      {
        userId: 'user-uuid-1',
        input: makeRecipeInput({status: 'perfected'}),
        recipeId: 'recipe-uuid-1',
        versionId: 'version-uuid-1',
      },
      mockQuery,
    );
    expect(result.title).toBe('Test Recipe');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('content_revision = content_revision + 1'),
      ['recipe-uuid-1'],
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('status'), [
      'recipe-uuid-1',
      'perfected',
    ]);
  });

  // Regression for #394: an editable-version save changes what meal
  // detail reads for each member meal, so it must advance those meals'
  // updated_at (their ETag token) as part of the save — the metadata-only
  // path (saveRecipeMetadata) already does; this path must not lag it.
  test('advances member meals updated_at when updating an existing version', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'version-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
    const result = await saveRecipeFromInput(
      {
        userId: 'user-uuid-1',
        input: makeRecipeInput({status: 'perfected'}),
        recipeId: 'recipe-uuid-1',
        versionId: 'version-uuid-1',
      },
      mockQuery,
    );
    expect(result.title).toBe('Test Recipe');
    const touchCall = mockQuery.mock.calls.find(([sql]) =>
      (sql as unknown as string).includes('update meals'),
    );
    expect(touchCall).toBeDefined();
    expect(touchCall?.[0]).toContain(
      'select meal_id from meal_recipes where recipe_id = $1',
    );
    expect(touchCall?.[1]).toEqual(['recipe-uuid-1']);
  });

  test('preserves the lineage status when an update omits status (#275)', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce({
        ...makeQueryResult([{id: 'version-uuid-1'}]),
        rowCount: 1,
      })
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
    await saveRecipeFromInput(
      {
        userId: 'user-uuid-1',
        input: makeRecipeInput(),
        recipeId: 'recipe-uuid-1',
        versionId: 'version-uuid-1',
      },
      mockQuery,
    );
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('update recipes set status'),
      expect.anything(),
    );
  });

  test('throws RecipeNotFoundError when update misses', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});
    await expect(
      saveRecipeFromInput(
        {
          userId: 'user-uuid-1',
          input: makeRecipeInput(),
          recipeId: 'missing',
          versionId: 'missing-version',
        },
        mockQuery,
      ),
    ).rejects.toThrow(RecipeNotFoundError);
  });

  test('throws RecipeNotFoundError when detail fetch returns no row', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([]));
    await expect(
      saveRecipeFromInput(
        {userId: 'user-uuid-1', input: makeRecipeInput()},
        mockQuery,
      ),
    ).rejects.toThrow(RecipeNotFoundError);
  });

  test('throws when lineage creation returns no id', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    await expect(
      saveRecipeFromInput(
        {userId: 'user-uuid-1', input: makeRecipeInput()},
        mockQuery,
      ),
    ).rejects.toThrow('Failed to create recipe lineage');
  });

  test('throws when version creation returns no id', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([]));
    await expect(
      saveRecipeFromInput(
        {userId: 'user-uuid-1', input: makeRecipeInput()},
        mockQuery,
      ),
    ).rejects.toThrow('Failed to create recipe version');
  });

  test('throws RecipeNotFoundError when version update omits recipeId', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce({
      ...makeQueryResult([{id: 'version-uuid-1'}]),
      rowCount: 1,
    });
    await expect(
      saveRecipeFromInput(
        {
          userId: 'user-uuid-1',
          input: makeRecipeInput(),
          versionId: 'version-uuid-1',
        },
        mockQuery,
      ),
    ).rejects.toThrow(RecipeNotFoundError);
  });
});

describe('saveNewRecipeFromInput', () => {
  test('creates a recipe and returns ids with detail', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
    const result = await saveNewRecipeFromInput(
      {userId: 'user-uuid-1', input: makeRecipeInput(), createdVia: 'manual'},
      mockQuery,
    );
    expect(result.recipeId).toBe('recipe-uuid-1');
    expect(result.versionId).toBe('version-uuid-1');
    expect(result.recipe.title).toBe('Test Recipe');
  });

  test('throws RecipeNotFoundError when detail fetch returns no row', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([]));
    await expect(
      saveNewRecipeFromInput(
        {userId: 'user-uuid-1', input: makeRecipeInput(), createdVia: 'manual'},
        mockQuery,
      ),
    ).rejects.toThrow(RecipeNotFoundError);
  });
});
