import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  checkRecipeCap,
  consumeAiCall,
  refundAiCall,
  withRecipeCap,
} from './aiMetering.js';

const mockQuery = createMockQuery();

describe('aiMetering quota accounting', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('consumeAiCall returns the period start for refunds', async () => {
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([{calls: 3, period_start: '2026-10-01', allowed: true}]),
    );
    const quota = await consumeAiCall('user-1', 'plus', mockQuery);
    expect(quota).toEqual({ok: true, periodStart: '2026-10-01'});
    // The increment is conditional on being under the limit.
    expect(mockQuery.mock.calls[0]?.[0]).toContain('when ai_usage.calls < $2');
    expect(mockQuery.mock.calls[0]?.[1]).toEqual(['user-1', 100]);
  });

  test('consumeAiCall rejects without incrementing past the limit', async () => {
    // 100 calls already on a Plus (100/month) plan: allowed=false, and the
    // CASE leaves calls at 100 instead of inflating it.
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {calls: 100, period_start: '2026-10-01', allowed: false},
      ]),
    );
    const quota = await consumeAiCall('user-1', 'plus', mockQuery);
    expect(quota).toEqual({ok: false, used: 100, limit: 100});
  });

  test('refundAiCall targets the consumed period, not the current month', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await refundAiCall('user-1', mockQuery, '2026-09-01');
    const [sql, params] = mockQuery.mock.calls[0] ?? [];
    expect(sql).toContain('period_start = $2::date');
    expect(params).toEqual(['user-1', '2026-09-01']);
  });

  test('refundAiCall falls back to the current month without a period', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await refundAiCall('user-1', mockQuery);
    const [sql, params] = mockQuery.mock.calls[0] ?? [];
    expect(sql).toContain("date_trunc('month', now())");
    expect(params).toEqual(['user-1']);
  });

  test('checkRecipeCap always passes for unlimited plans', async () => {
    const cap = await checkRecipeCap('user-1', 'plus', mockQuery);
    expect(cap).toEqual({ok: true});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('withRecipeCap skips the check for unlimited plans', async () => {
    const create = async () => 'created';
    const result = await withRecipeCap('user-1', 'power', mockQuery, create);
    expect(result).toEqual({ok: true, value: 'created'});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('withRecipeCap creates when under the cap', async () => {
    mockQuery.mockResolvedValueOnce(makeQueryResult([{count: '10'}]));
    const create = async () => 'created';
    const result = await withRecipeCap('user-1', 'free', mockQuery, create);
    expect(result).toEqual({ok: true, value: 'created'});
  });

  test('withRecipeCap rejects when at the cap without creating', async () => {
    mockQuery.mockResolvedValueOnce(makeQueryResult([{count: '50'}]));
    const create = async () => {
      throw new Error('must not create');
    };
    const result = await withRecipeCap('user-1', 'free', mockQuery, create);
    expect(result).toEqual({ok: false, used: 50, limit: 50});
  });
});
