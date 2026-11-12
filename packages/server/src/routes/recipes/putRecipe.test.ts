import {jest} from '@jest/globals';
import request from 'supertest';

import {RecipeMetadataInputSchema} from '../../lib/schemas.js';
import {makeRecipeDetail, makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

// #460 tranche 1: the former qualifier-segment files for this route
// (putRecipe.draftLocked / .editable / .metadata / .metadataParse /
// .notFound / .rethrow) each mocked a different module, so they could
// not be plain concatenations. They are merged here behind
// per-describe mutable mock factories: each factory delegates to a
// jest.fn whose implementation a describe installs in beforeEach.
// The default implementation (installed by the root beforeEach) is
// the real module, loaded before the mocks are registered, so the
// canonical describes below exercise the real save paths exactly as
// the former putRecipe.test.ts did.
const actualIsVersionEditableModule =
  await import('../../lib/isVersionEditable.js');
const actualSaveRecipeFromInputModule =
  await import('../../lib/saveRecipeFromInput.js');
const actualSaveRecipeMetadataModule =
  await import('../../lib/saveRecipeMetadata.js');

const {RecipeNotFoundError} = actualSaveRecipeFromInputModule;

const mockIsVersionEditable =
  jest.fn<typeof actualIsVersionEditableModule.isVersionEditable>();
const mockIsVersionContentLocked =
  jest.fn<typeof actualIsVersionEditableModule.isVersionContentLocked>();
const mockSaveRecipeFromInput =
  jest.fn<typeof actualSaveRecipeFromInputModule.saveRecipeFromInput>();
const mockSaveNewRecipeFromInput =
  jest.fn<typeof actualSaveRecipeFromInputModule.saveNewRecipeFromInput>();
const mockSaveRecipeMetadata =
  jest.fn<typeof actualSaveRecipeMetadataModule.saveRecipeMetadata>();

jest.unstable_mockModule('../../lib/isVersionEditable.js', () => ({
  isVersionEditable: (
    ...args: Parameters<typeof actualIsVersionEditableModule.isVersionEditable>
  ) => mockIsVersionEditable(...args),
  isVersionContentLocked: (
    ...args: Parameters<
      typeof actualIsVersionEditableModule.isVersionContentLocked
    >
  ) => mockIsVersionContentLocked(...args),
  versionEditBlockedError:
    actualIsVersionEditableModule.versionEditBlockedError,
  versionContentLockedError:
    actualIsVersionEditableModule.versionContentLockedError,
}));

jest.unstable_mockModule('../../lib/saveRecipeFromInput.js', () => ({
  saveRecipeFromInput: (
    ...args: Parameters<
      typeof actualSaveRecipeFromInputModule.saveRecipeFromInput
    >
  ) => mockSaveRecipeFromInput(...args),
  saveNewRecipeFromInput: (
    ...args: Parameters<
      typeof actualSaveRecipeFromInputModule.saveNewRecipeFromInput
    >
  ) => mockSaveNewRecipeFromInput(...args),
  RecipeNotFoundError,
}));

jest.unstable_mockModule('../../lib/saveRecipeMetadata.js', () => ({
  saveRecipeMetadata: (
    ...args: Parameters<
      typeof actualSaveRecipeMetadataModule.saveRecipeMetadata
    >
  ) => mockSaveRecipeMetadata(...args),
}));

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

// Default: every mocked module behaves as the real implementation.
// Qualifier describes override only the factories they exercise.
beforeEach(() => {
  mockIsVersionEditable.mockImplementation(
    actualIsVersionEditableModule.isVersionEditable,
  );
  mockIsVersionContentLocked.mockImplementation(
    actualIsVersionEditableModule.isVersionContentLocked,
  );
  mockSaveRecipeFromInput.mockImplementation(
    actualSaveRecipeFromInputModule.saveRecipeFromInput,
  );
  mockSaveNewRecipeFromInput.mockImplementation(
    actualSaveRecipeFromInputModule.saveNewRecipeFromInput,
  );
  mockSaveRecipeMetadata.mockImplementation(
    actualSaveRecipeMetadataModule.saveRecipeMetadata,
  );
});

describe('PUT /recipes/:id', () => {
  test('returns 409 when content-locked version ingredient list changes', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(
        makeRecipeInput({
          title: 'Updated Title',
          ingredients: [
            {
              sortOrder: 0,
              name: 'Changed',
              quantity: 1,
              unit: 'cup',
              notes: null,
              isOptional: false,
            },
          ],
        }),
      );

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'Ingredients and instructions are locked on this version',
    );
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .put('/api/recipes/missing-id')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(404);
  });

  test('returns 404 when active version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recipe not found');
  });

  test('returns 404 when metadata save update affects no rows', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recipe not found');
  });

  test('returns 400 when body is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});
    expect(res.status).toBe(400);
  });

  test('propagates unexpected errors from metadata save', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockRejectedValueOnce(new Error('db down'));
    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(500);
  });

  test('returns 409 when recipe lifecycle is perfected', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'perfected'})]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([makeVersionDetailRow({status: 'perfected'})]),
      );
    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());
    expect(res.status).toBe(409);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .send(makeRecipeInput());
    expect(res.status).toBe(401);
  });
});

// Former putRecipe.draftLocked.test.ts: isVersionEditable and
// isVersionContentLocked both false.
describe('PUT /recipes/:id non-editable draft guard', () => {
  beforeEach(() => {
    mockIsVersionEditable.mockImplementation(() => false);
    mockIsVersionContentLocked.mockImplementation(() => false);
  });

  test('returns 409 when version is not editable and not content-locked', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'Ingredients and instructions are locked on this version',
    );
  });
});

// Former putRecipe.editable.test.ts: editable version, mocked save
// succeeding with the updated detail.
describe('PUT /recipes/:id editable save', () => {
  beforeEach(() => {
    mockIsVersionEditable.mockImplementation(() => true);
    mockIsVersionContentLocked.mockImplementation(() => false);
    mockSaveRecipeFromInput.mockImplementation(async () =>
      makeRecipeDetail({title: 'Updated Title'}),
    );
    mockSaveNewRecipeFromInput.mockImplementation(async () => {
      throw new Error('not used in this test');
    });
  });

  test('returns 200 when version is editable and save succeeds', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput({title: 'Updated Title'}));

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });
});

// Former putRecipe.metadata.test.ts: mocked metadata save succeeding;
// the version guards keep their real behavior.
describe('PUT /recipes/:id metadata save', () => {
  beforeEach(() => {
    mockSaveRecipeMetadata.mockImplementation(async () =>
      makeRecipeDetail({title: 'Metadata Updated'}),
    );
  });

  test('returns 200 for metadata-only update on content-locked version', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput({title: 'Metadata Updated'}));

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Metadata Updated');
  });
});

// Former putRecipe.metadataParse.test.ts: spies on the metadata
// schema's safeParse; no module mocks.
describe('PUT /recipes/:id metadata parse guard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns 400 when metadata schema rejects input', async () => {
    jest
      .spyOn(RecipeMetadataInputSchema, 'safeParse')
      .mockReturnValue({
        success: false,
        error: {message: 'bad metadata'},
      } as never);
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('bad metadata');
  });
});

// Former putRecipe.notFound.test.ts: editable version, mocked save
// throwing RecipeNotFoundError.
describe('PUT /recipes/:id save not found', () => {
  beforeEach(() => {
    mockIsVersionEditable.mockImplementation(() => true);
    mockIsVersionContentLocked.mockImplementation(() => false);
    mockSaveRecipeFromInput.mockImplementation(async () => {
      throw new RecipeNotFoundError();
    });
    mockSaveNewRecipeFromInput.mockImplementation(async () => {
      throw new Error('not used in this test');
    });
  });

  test('returns 404 when saveRecipeFromInput throws RecipeNotFoundError', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recipe not found');
  });
});

// Former putRecipe.rethrow.test.ts: editable version, mocked save
// throwing an unexpected error.
describe('PUT /recipes/:id save rethrow', () => {
  beforeEach(() => {
    mockIsVersionEditable.mockImplementation(() => true);
    mockIsVersionContentLocked.mockImplementation(() => false);
    mockSaveRecipeFromInput.mockImplementation(async () => {
      throw new Error('save failed');
    });
    mockSaveNewRecipeFromInput.mockImplementation(async () => {
      throw new Error('not used in this test');
    });
  });

  test('propagates unexpected saveRecipeFromInput errors', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    await expect(
      request(getApp())
        .put('/api/recipes/recipe-uuid-1')
        .set('Authorization', 'Bearer valid-token')
        .send(makeRecipeInput()),
    ).resolves.toMatchObject({status: 500});
  });
});
