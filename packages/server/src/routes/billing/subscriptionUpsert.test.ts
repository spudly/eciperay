import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {upsertSubscription} from './subscriptionUpsert.js';
import type {PaddleEvent} from './paddleEvents.js';

const mockQuery = createMockQuery();

const makeEvent = (overrides: Partial<PaddleEvent> = {}): PaddleEvent => ({
  event_id: 'evt_test_123',
  event_type: 'subscription.updated',
  occurred_at: '2026-10-13T16:00:00.000Z',
  data: {
    id: 'sub_123',
    customer_id: 'ctm_123',
    status: 'active',
    items: [{price: {id: 'pri_plus_monthly'}}],
    current_billing_period: {
      starts_at: '2026-10-13T00:00:00.000Z',
      ends_at: '2026-11-13T00:00:00.000Z',
    },
    scheduled_change: null,
  },
  ...overrides,
});

describe('upsertSubscription', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('throws on an unknown price id so Paddle retries', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    });

    await expect(
      upsertSubscription(makeEvent(), 'user-uuid-1', mockQuery),
    ).rejects.toThrow('Unknown Paddle price id: pri_plus_monthly');
  });

  test('skips the upsert for a stale event', async () => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(
          makeQueryResult([
            {
              status: 'active',
              past_due_since: null,
              paddle_last_event_at: '2026-10-13T17:00:00.000Z',
            },
          ]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    await upsertSubscription(
      makeEvent({occurred_at: '2026-10-13T16:00:00.000Z'}),
      'user-uuid-1',
      mockQuery,
    );
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);
  });

  test('upserts and persists the event timestamp', async () => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    await upsertSubscription(makeEvent(), 'user-uuid-1', mockQuery);
    const upsert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(upsert).toBeDefined();
    // Event timestamp is the last bind parameter.
    expect(upsert?.[1]?.[10]).toBe('2026-10-13T16:00:00.000Z');
  });
});
