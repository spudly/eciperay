import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';
import {nockAnthropicMessage} from '../test/mockNockAnthropic.js';

import {
  ensureRecipeStepTiming,
  refreshRecipeStepTiming,
} from './refreshRecipeStepTiming.js';

const VERSION_ID = '00000000-0000-4000-8000-000000000012';

describe('refreshRecipeStepTiming', () => {
  test('marks version ready when there are no instructions', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            version_id: VERSION_ID,
            title: 'Soup',
            prep_time_min: null,
            cook_time_min: null,
            step_timing_status: null,
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const ok = await refreshRecipeStepTiming(VERSION_ID, mockQuery);
    expect(ok).toBe(true);
  });

  test('updates instruction durations from AI response', async () => {
    nockAnthropicMessage(
      JSON.stringify([
        {stepNumber: 1, durationMin: 8},
        {stepNumber: 2, durationMin: 12},
      ]),
    );
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            version_id: VERSION_ID,
            title: 'Soup',
            prep_time_min: 10,
            cook_time_min: 20,
            step_timing_status: null,
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {id: 'i1', step_number: 1, body: 'Chop'},
          {id: 'i2', step_number: 2, body: 'Simmer'},
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const ok = await refreshRecipeStepTiming(VERSION_ID, mockQuery);
    expect(ok).toBe(true);
  });
});

describe('ensureRecipeStepTiming', () => {
  test('skips refresh when timing already ready', async () => {
    const mockQuery = createMockQuery();
    await ensureRecipeStepTiming(VERSION_ID, 'ready', mockQuery);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('refreshRecipeStepTiming failures', () => {
  test('returns false when version is missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const ok = await refreshRecipeStepTiming(VERSION_ID, mockQuery);
    expect(ok).toBe(false);
  });

  test('marks failed when AI response is invalid', async () => {
    nockAnthropicMessage('not-json');
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            version_id: VERSION_ID,
            title: 'Soup',
            prep_time_min: null,
            cook_time_min: null,
            step_timing_status: null,
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([{id: 'i1', step_number: 1, body: 'Chop'}]),
      )
      .mockResolvedValueOnce(makeQueryResult([]));

    await expect(
      refreshRecipeStepTiming(VERSION_ID, mockQuery),
    ).rejects.toThrow();
  });

  test('uses default duration when AI omits a step', async () => {
    nockAnthropicMessage(JSON.stringify([{stepNumber: 1, durationMin: 4}]));
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            version_id: VERSION_ID,
            title: 'Soup',
            prep_time_min: null,
            cook_time_min: null,
            step_timing_status: null,
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {id: 'i1', step_number: 1, body: 'Chop'},
          {id: 'i2', step_number: 2, body: 'Simmer'},
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const ok = await refreshRecipeStepTiming(VERSION_ID, mockQuery);
    expect(ok).toBe(true);
    const updateCalls = mockQuery.mock.calls.filter(
      call =>
        typeof call[0] === 'string' && call[0].includes('update instructions'),
    );
    expect(updateCalls.some(([, params]) => params?.[1] === 5)).toBe(true);
  });

  test('marks failed when a non-error is thrown', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from recipe_versions rv')) {
        return makeQueryResult([
          {
            version_id: VERSION_ID,
            title: 'Soup',
            prep_time_min: null,
            cook_time_min: null,
            step_timing_status: null,
          },
        ]);
      }
      if (sql.includes("step_timing_status = 'pending'")) {
        return makeQueryResult([]);
      }
      if (sql.includes('from instructions')) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- cover non-Error catch branch
        throw 'boom';
      }
      if (sql.includes("step_timing_status = 'failed'")) {
        return makeQueryResult([]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    await expect(refreshRecipeStepTiming(VERSION_ID, mockQuery)).rejects.toBe(
      'boom',
    );
  });
});

describe('ensureRecipeStepTiming refresh flag', () => {
  test('refreshes when refresh is true even if ready', async () => {
    nockAnthropicMessage(JSON.stringify([{stepNumber: 1, durationMin: 5}]));
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            version_id: VERSION_ID,
            title: 'Soup',
            prep_time_min: null,
            cook_time_min: null,
            step_timing_status: 'ready',
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([{id: 'i1', step_number: 1, body: 'Chop'}]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));

    await ensureRecipeStepTiming(VERSION_ID, 'ready', mockQuery, true);
    expect(mockQuery).toHaveBeenCalled();
  });
});
