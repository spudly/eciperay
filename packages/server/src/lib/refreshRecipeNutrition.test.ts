import {jest} from '@jest/globals';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';
import {nockAnthropicMessage} from '../test/mockNockAnthropic.js';

import {
  refreshRecipeNutrition,
  scheduleNutritionRefresh,
} from './refreshRecipeNutrition.js';

const NUTRITION_RESPONSE = JSON.stringify({
  calories: 100,
  proteinG: 10,
  carbsG: 5,
  fatG: 2,
  fiberG: 1,
  sugarG: 0,
  sodiumMg: 50,
  preparedWeightG: 400,
  disclaimer: 'Estimated.',
});

describe('refreshRecipeNutrition', () => {
  test('persists macros and satiety score', async () => {
    nockAnthropicMessage(
      JSON.stringify({
        calories: 100,
        proteinG: 10,
        carbsG: 5,
        fatG: 2,
        fiberG: null,
        sugarG: null,
        sodiumMg: null,
        preparedWeightG: 400,
        disclaimer: 'Estimated.',
      }),
    );
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            version_id: 'version-1',
            recipe_id: 'recipe-1',
            servings: 2,
            title: 'Soup',
            calories: null,
            protein_g: null,
            carbs_g: null,
            fat_g: null,
            fiber_g: null,
            sugar_g: null,
            sodium_mg: null,
            prepared_weight_g: null,
            satiety_score: null,
            nutrition_status: null,
            nutrition_disclaimer: null,
            nutrition_updated_at: null,
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {name: 'Broth', quantity: 2, unit: 'cups'},
          {name: 'Salt', quantity: null, unit: null},
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            version_id: 'version-1',
            recipe_id: 'recipe-1',
            servings: 2,
            title: 'Soup',
            calories: 100,
            protein_g: 10,
            carbs_g: 5,
            fat_g: 2,
            fiber_g: null,
            sugar_g: null,
            sodium_mg: null,
            prepared_weight_g: 400,
            satiety_score: 70,
            nutrition_status: 'ready',
            nutrition_disclaimer: 'Estimated.',
            nutrition_updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]),
      );

    const result = await refreshRecipeNutrition('version-1', mockQuery);
    expect(result).toMatchObject({
      calories: 100,
      preparedWeightG: 400,
      status: 'ready',
    });
    expect(result?.satietyScore).toBeGreaterThan(0);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('satiety_score'),
      expect.arrayContaining(['version-1', 100, 10, 5, 2]),
    );
  });

  test('returns null when the post-update nutrition fetch is empty', async () => {
    nockAnthropicMessage(NUTRITION_RESPONSE);
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            version_id: 'version-1',
            recipe_id: 'recipe-1',
            servings: 2,
            title: 'Soup',
            calories: null,
            protein_g: null,
            carbs_g: null,
            fat_g: null,
            fiber_g: null,
            sugar_g: null,
            sodium_mg: null,
            prepared_weight_g: null,
            satiety_score: null,
            nutrition_status: null,
            nutrition_disclaimer: null,
            nutrition_updated_at: null,
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([{name: 'Broth', quantity: 2, unit: 'cups'}]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));

    await expect(
      refreshRecipeNutrition('version-1', mockQuery),
    ).resolves.toBeNull();
  });

  test('returns null when version is missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    await expect(
      refreshRecipeNutrition('missing', mockQuery),
    ).resolves.toBeNull();
  });

  test('marks nutrition failed and rethrows on error', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            version_id: 'version-1',
            recipe_id: 'recipe-1',
            servings: 2,
            title: 'Soup',
            calories: null,
            protein_g: null,
            carbs_g: null,
            fat_g: null,
            fiber_g: null,
            sugar_g: null,
            sodium_mg: null,
            prepared_weight_g: null,
            satiety_score: null,
            nutrition_status: null,
            nutrition_disclaimer: null,
            nutrition_updated_at: null,
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockRejectedValueOnce(new Error('ingredient query failed'));

    await expect(
      refreshRecipeNutrition('version-1', mockQuery),
    ).rejects.toThrow('ingredient query failed');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("nutrition_status = 'failed'"),
      ['version-1'],
    );
  });

  test('schedules background refresh outside Jest workers', async () => {
    const previousWorkerId = process.env['JEST_WORKER_ID'];
    delete process.env['JEST_WORKER_ID'];
    const pendingVersion = {
      version_id: 'version-1',
      recipe_id: 'recipe-1',
      servings: 2,
      title: 'Soup',
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      fiber_g: null,
      sugar_g: null,
      sodium_mg: null,
      prepared_weight_g: null,
      satiety_score: null,
      nutrition_status: null,
      nutrition_disclaimer: null,
      nutrition_updated_at: null,
    };
    const runScheduledRefresh = async (rejection: unknown) => {
      const mockQuery = createMockQuery();
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([pendingVersion]))
        .mockResolvedValueOnce(makeQueryResult([]))
        .mockRejectedValueOnce(rejection)
        .mockResolvedValue(makeQueryResult([]));
      const queued: (() => void)[] = [];
      const setImmediateSpy = jest
        .spyOn(globalThis, 'setImmediate')
        .mockImplementation((fn: () => void) => {
          queued.push(fn);
          return 0 as unknown as NodeJS.Immediate;
        });
      try {
        scheduleNutritionRefresh('version-1', mockQuery);
        expect(queued).toHaveLength(1);
        queued[0]?.();
        await new Promise(resolve => {
          setTimeout(resolve, 0);
        });
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("nutrition_status = 'failed'"),
          ['version-1'],
        );
      } finally {
        setImmediateSpy.mockRestore();
      }
    };

    try {
      await runScheduledRefresh(new Error('background fail'));
      await runScheduledRefresh({reason: 'non-error'});
    } finally {
      if (previousWorkerId === undefined) {
        delete process.env['JEST_WORKER_ID'];
      } else {
        process.env['JEST_WORKER_ID'] = previousWorkerId;
      }
    }
  });

  test('no-ops when running inside a Jest worker', () => {
    const mockQuery = createMockQuery();
    scheduleNutritionRefresh('version-1', mockQuery);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
