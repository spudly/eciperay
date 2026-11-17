import {jest} from '@jest/globals';

import {makeRecipeInput, makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

// #535: saveNewRecipeFromInput schedules the auto-image trigger from the
// shared save layer — capture the scheduler behind a mutable factory
// (default: the real implementation, which is a no-op under Jest) so the
// save tests can assert scheduling without firing generation.
const actualAutoImageModule = await import('./autoGenerateRecipeImage.js');

const mockScheduleAutoGenerateRecipeImage =
  jest.fn<typeof actualAutoImageModule.scheduleAutoGenerateRecipeImage>();

jest.unstable_mockModule('./autoGenerateRecipeImage.js', () => ({
  autoGenerateRecipeImage: actualAutoImageModule.autoGenerateRecipeImage,
  autoImageContextFromDetail:
    actualAutoImageModule.autoImageContextFromDetail,
  scheduleAutoGenerateRecipeImage: (
    ...args: Parameters<
      typeof actualAutoImageModule.scheduleAutoGenerateRecipeImage
    >
  ) => mockScheduleAutoGenerateRecipeImage(...args),
}));

const {
  RecipeNotFoundError,
  saveNewRecipeFromInput,
  saveRecipeFromInput,
} = await import('./saveRecipeFromInput.js');

beforeEach(() => {
  mockScheduleAutoGenerateRecipeImage.mockReset();
  mockScheduleAutoGenerateRecipeImage.mockImplementation(
    actualAutoImageModule.scheduleAutoGenerateRecipeImage,
  );
});

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

  // #535: the shared save layer is what covers the import routes, AI
  // create-session saves, and bulk import — they all call this function.
  test('schedules auto-image generation for an imageless save', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
    await saveNewRecipeFromInput(
      {
        userId: 'user-uuid-1',
        supabaseUid: 'supabase-uid-1',
        input: makeRecipeInput(),
        createdVia: 'import_url',
      },
      mockQuery,
    );
    expect(mockScheduleAutoGenerateRecipeImage).toHaveBeenCalledTimes(1);
    expect(mockScheduleAutoGenerateRecipeImage).toHaveBeenCalledWith(
      {
        userId: 'user-uuid-1',
        supabaseUid: 'supabase-uid-1',
        recipe: expect.objectContaining({
          recipeId: 'recipe-uuid-1',
          versionId: 'version-uuid-1',
          imageUrl: null,
        }),
      },
      mockQuery,
    );
  });

  test('does not schedule auto-image when the save already has an image', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-1'}]))
      .mockResolvedValueOnce(
        makeQueryResult([
          makeRecipeDetailRow({image_url: 'https://cdn.example/photo.png'}),
        ]),
      );
    await saveNewRecipeFromInput(
      {
        userId: 'user-uuid-1',
        supabaseUid: 'supabase-uid-1',
        input: makeRecipeInput(),
        createdVia: 'import_url',
      },
      mockQuery,
    );
    expect(mockScheduleAutoGenerateRecipeImage).not.toHaveBeenCalled();
  });

  test('does not schedule auto-image without a supabaseUid', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
    await saveNewRecipeFromInput(
      {userId: 'user-uuid-1', input: makeRecipeInput(), createdVia: 'manual'},
      mockQuery,
    );
    expect(mockScheduleAutoGenerateRecipeImage).not.toHaveBeenCalled();
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
