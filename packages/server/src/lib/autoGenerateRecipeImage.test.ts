import {jest} from '@jest/globals';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  autoGenerateRecipeImage,
  autoImageContextFromDetail,
  scheduleAutoGenerateRecipeImage,
  type AutoGenerateRecipeImageDeps,
} from './autoGenerateRecipeImage.js';

const makeDeps = (): AutoGenerateRecipeImageDeps => ({
  generatePrompt: jest
    .fn<AutoGenerateRecipeImageDeps['generatePrompt']>()
    .mockResolvedValue('A plated test dish'),
  generateImage: jest
    .fn<AutoGenerateRecipeImageDeps['generateImage']>()
    .mockResolvedValue({imageBase64: 'aGVsbG8=', contentType: 'image/png'}),
  uploadImage: jest
    .fn<AutoGenerateRecipeImageDeps['uploadImage']>()
    .mockResolvedValue('https://cdn.example/user-uuid-1/recipe-uuid-1'),
  consume: jest
    .fn<AutoGenerateRecipeImageDeps['consume']>()
    .mockResolvedValue({ok: true, periodStart: '2026-11-01'}),
  refund: jest
    .fn<AutoGenerateRecipeImageDeps['refund']>()
    .mockResolvedValue(undefined),
  resolveEntitlementFn: jest
    .fn<AutoGenerateRecipeImageDeps['resolveEntitlementFn']>()
    .mockResolvedValue({
      plan: 'plus',
      status: 'active',
      aiUsed: 0,
      aiLimit: 100,
      periodEndsAt: null,
      paddleCustomerId: null,
      cancelAtPeriodEnd: false,
    }),
});

const args = {
  userId: 'user-uuid-1',
  supabaseUid: 'supabase-uid-1',
  recipe: {
    recipeId: 'recipe-uuid-1',
    versionId: 'version-uuid-1',
    title: 'Test Recipe',
    description: 'A test recipe',
    imageUrl: null,
    ingredients: [{name: 'pasta', quantity: 200, unit: 'g'}],
    instructions: ['Boil pasta'],
  },
};

describe('autoGenerateRecipeImage (#407)', () => {
  test('save without an image generates exactly once and attaches it', async () => {
    const mockQuery = createMockQuery();
    // Claim succeeds, then the conditional attach succeeds.
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-1'}]));
    const deps = makeDeps();

    const outcome = await autoGenerateRecipeImage(args, mockQuery, deps);

    expect(outcome).toBe('attached');
    expect(deps.generatePrompt).toHaveBeenCalledTimes(1);
    expect(deps.generatePrompt).toHaveBeenCalledWith({
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: [{name: 'pasta', quantity: 200, unit: 'g'}],
      instructions: ['Boil pasta'],
    });
    expect(deps.generateImage).toHaveBeenCalledTimes(1);
    expect(deps.generateImage).toHaveBeenCalledWith('A plated test dish');
    // Same upload function/bucket as the explicit generate action, but
    // under the dedicated auto-generated key: a raced user upload writes
    // 'recipe-uuid-1' and must never be overwritten by these bytes.
    expect(deps.uploadImage).toHaveBeenCalledTimes(1);
    expect(deps.uploadImage).toHaveBeenCalledWith(
      'supabase-uid-1',
      'recipe-uuid-1-auto-generated',
      Buffer.from('aGVsbG8=', 'base64'),
      'image/png',
    );
    // Same entitlement gating as the explicit action.
    expect(deps.resolveEntitlementFn).toHaveBeenCalledWith(
      'user-uuid-1',
      mockQuery,
    );
    expect(deps.consume).toHaveBeenCalledWith(
      'user-uuid-1',
      'plus',
      mockQuery,
      {unlimited: undefined},
    );
    // The claim is the once-per-recipe guard (migration 022).
    expect(mockQuery.mock.calls[0]?.[0]).toContain(
      'auto_image_attempted_at is null',
    );
    // Attach is conditional on the version still being imageless.
    expect(mockQuery.mock.calls[1]?.[0]).toContain('image_url is null');
    expect(mockQuery.mock.calls[1]?.[1]).toEqual([
      'version-uuid-1',
      'https://cdn.example/user-uuid-1/recipe-uuid-1',
    ]);
    expect(deps.refund).not.toHaveBeenCalled();
  });

  test('save with an image does not generate', async () => {
    const mockQuery = createMockQuery();
    const deps = makeDeps();

    const outcome = await autoGenerateRecipeImage(
      {
        ...args,
        recipe: {...args.recipe, imageUrl: 'https://cdn.example/photo.png'},
      },
      mockQuery,
      deps,
    );

    expect(outcome).toBe('skipped-has-image');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(deps.generateImage).not.toHaveBeenCalled();
    expect(deps.consume).not.toHaveBeenCalled();
  });

  test('a second save does not re-generate (attempt already claimed)', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const deps = makeDeps();

    const outcome = await autoGenerateRecipeImage(args, mockQuery, deps);

    expect(outcome).toBe('skipped-already-attempted');
    expect(deps.generateImage).not.toHaveBeenCalled();
    expect(deps.consume).not.toHaveBeenCalled();
  });

  test('generation failure leaves the saved recipe intact and refunds quota', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]));
    const deps = makeDeps();
    (
      deps.generateImage as jest.MockedFunction<
        AutoGenerateRecipeImageDeps['generateImage']
      >
    ).mockRejectedValueOnce(new Error('OpenAI unavailable'));

    // Never throws: the save already succeeded and must stand.
    const outcome = await autoGenerateRecipeImage(args, mockQuery, deps);

    expect(outcome).toBe('failed');
    expect(deps.refund).toHaveBeenCalledWith(
      'user-uuid-1',
      mockQuery,
      '2026-11-01',
    );
    expect(deps.uploadImage).not.toHaveBeenCalled();
    // Only the claim query ran — no attach was attempted.
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('quota exhaustion skips generation without refunding', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]));
    const deps = makeDeps();
    (
      deps.consume as jest.MockedFunction<
        AutoGenerateRecipeImageDeps['consume']
      >
    ).mockResolvedValueOnce({ok: false, used: 5, limit: 5});

    const outcome = await autoGenerateRecipeImage(args, mockQuery, deps);

    expect(outcome).toBe('skipped-quota-exhausted');
    expect(deps.generateImage).not.toHaveBeenCalled();
    expect(deps.refund).not.toHaveBeenCalled();
  });

  test('a claim failure is contained and never thrown to the save', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockRejectedValueOnce(new Error('db down'));
    const deps = makeDeps();

    const outcome = await autoGenerateRecipeImage(args, mockQuery, deps);

    expect(outcome).toBe('failed');
    expect(deps.generateImage).not.toHaveBeenCalled();
    expect(deps.refund).not.toHaveBeenCalled();
  });

  test('a user upload landing during generation is never overwritten', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([]));
    const deps = makeDeps();

    const outcome = await autoGenerateRecipeImage(args, mockQuery, deps);

    expect(outcome).toBe('skipped-image-raced');
    // The discarded generation went to its own storage key, so the
    // user's uploaded photo bytes (at the plain recipe key) survive.
    expect(deps.uploadImage).toHaveBeenCalledWith(
      'supabase-uid-1',
      'recipe-uuid-1-auto-generated',
      expect.any(Buffer),
      'image/png',
    );
  });
});

describe('autoImageContextFromDetail', () => {
  test('maps a recipe detail into the trigger context', () => {
    expect(
      autoImageContextFromDetail({
        id: 'recipe-uuid-1',
        versionId: 'version-uuid-1',
        title: 'Soup',
        description: null,
        imageUrl: null,
        ingredients: [{name: 'water', quantity: 2, unit: 'cups'}],
        instructions: [{body: 'Boil'}, {body: 'Serve'}],
      }),
    ).toEqual({
      recipeId: 'recipe-uuid-1',
      versionId: 'version-uuid-1',
      title: 'Soup',
      description: null,
      imageUrl: null,
      ingredients: [{name: 'water', quantity: 2, unit: 'cups'}],
      instructions: ['Boil', 'Serve'],
    });
  });

  test('accepts instructions already flattened to strings', () => {
    expect(
      autoImageContextFromDetail({
        recipeId: 'recipe-uuid-1',
        versionId: 'version-uuid-1',
        title: 'Soup',
        description: null,
        imageUrl: null,
        ingredients: [],
        instructions: ['Boil'],
      }).instructions,
    ).toEqual(['Boil']);
  });
});

describe('scheduleAutoGenerateRecipeImage', () => {
  test('is a no-op for a recipe that already has an image', () => {
    const mockQuery = createMockQuery();
    expect(() =>
      scheduleAutoGenerateRecipeImage(
        {
          ...args,
          recipe: {...args.recipe, imageUrl: 'https://cdn.example/x.png'},
        },
        mockQuery,
      ),
    ).not.toThrow();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('defers generation for an imageless recipe outside Jest', async () => {
    // The scheduler skips under Jest (JEST_WORKER_ID is set); clear it and
    // capture the setImmediate callback so the deferred path itself is
    // exercised — this test fails if scheduling is removed.
    const originalWorkerId = process.env['JEST_WORKER_ID'];
    delete process.env['JEST_WORKER_ID'];
    const originalSetImmediate = global.setImmediate;
    const captured: (() => void)[] = [];
    global.setImmediate = ((callback: () => void) => {
      captured.push(callback);
      return 0 as unknown as NodeJS.Immediate;
    }) as typeof setImmediate;
    const mockQuery = createMockQuery();
    // The claim finds no row to claim, so the deferred run stops before
    // any real AI dependency is touched.
    mockQuery.mockResolvedValue(makeQueryResult([]));
    try {
      // A recipe with an image queues no callback even outside Jest.
      scheduleAutoGenerateRecipeImage(
        {
          ...args,
          recipe: {...args.recipe, imageUrl: 'https://cdn.example/x.png'},
        },
        mockQuery,
      );
      expect(captured).toHaveLength(0);

      scheduleAutoGenerateRecipeImage(args, mockQuery);
      expect(captured).toHaveLength(1);
      expect(mockQuery).not.toHaveBeenCalled();

      captured[0]?.();
      // Let the deferred async run settle.
      await new Promise(resolve => originalSetImmediate(resolve));
      await new Promise(resolve => originalSetImmediate(resolve));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('auto_image_attempted_at is null'),
        ['recipe-uuid-1'],
      );
    } finally {
      global.setImmediate = originalSetImmediate;
      if (originalWorkerId === undefined) {
        delete process.env['JEST_WORKER_ID'];
      } else {
        process.env['JEST_WORKER_ID'] = originalWorkerId;
      }
    }
  });
});
