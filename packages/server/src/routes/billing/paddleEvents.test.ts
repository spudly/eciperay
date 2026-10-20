import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {handlePaddleEvent, type PaddleEvent} from './paddleEvents.js';

const mockQuery = createMockQuery();

const makeStatusEvent = (
  overrides: Partial<PaddleEvent> = {},
): PaddleEvent => ({
  event_id: 'evt_test_123',
  event_type: 'subscription.canceled',
  occurred_at: '2026-10-18T00:00:00.000Z',
  data: {id: 'sub_1', customer_id: 'ctm_123', status: 'canceled'},
  ...overrides,
});

describe('handlePaddleEvent status updates', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('throws when advancing the superseded clock reports a null rowCount', async () => {
    // pg reports a null rowCount for some commands. For the
    // superseded-slot clock advance that must be treated like zero
    // rows matched — a concurrent writer swapped the slot after the
    // SELECT — so the handler throws and Paddle redelivers instead
    // of recording the cancellation as processed and losing it.
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(
          makeQueryResult([
            {
              paddle_subscription_id: 'sub_new',
              paddle_last_event_at: '2026-10-19T00:00:00.000Z',
              superseded_subscription_id: 'sub_old',
              superseded_last_event_at: '2026-10-15T00:00:00.000Z',
            },
          ]),
        );
      }
      if (sql.includes('update subscriptions')) {
        return Promise.resolve({...makeQueryResult([]), rowCount: null});
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const event = makeStatusEvent({
      data: {id: 'sub_old', customer_id: 'ctm_123', status: 'canceled'},
    });
    await expect(handlePaddleEvent(event, mockQuery)).rejects.toThrow(
      'Paddle status event evt_test_123 raced a subscription replacement',
    );
    const update = mockQuery.mock.calls.find(args =>
      args[0].includes('update subscriptions'),
    );
    expect(update?.[0]).toContain('greatest(');
    expect(update?.[1]).toEqual(['sub_old', '2026-10-18T00:00:00.000Z']);
  });

  test('throws when the conditional status write reports a null rowCount', async () => {
    // Same null-rowCount semantics for the current subscription's
    // status write: the conditional UPDATE matched nothing the
    // handler can confirm, so the cancellation stays retryable
    // rather than being acknowledged over newer state.
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(
          makeQueryResult([
            {
              paddle_subscription_id: 'sub_1',
              paddle_last_event_at: '2026-10-17T00:00:00.000Z',
              superseded_subscription_id: null,
              superseded_last_event_at: null,
            },
          ]),
        );
      }
      if (sql.includes('update subscriptions')) {
        return Promise.resolve({...makeQueryResult([]), rowCount: null});
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    await expect(
      handlePaddleEvent(makeStatusEvent(), mockQuery),
    ).rejects.toThrow(
      'Paddle status event evt_test_123 raced a newer subscription update',
    );
    const update = mockQuery.mock.calls.find(args =>
      args[0].includes('update subscriptions'),
    );
    expect(update?.[1]).toEqual([
      'sub_1',
      'cancelled',
      '2026-10-18T00:00:00.000Z',
      '2026-10-17T00:00:00.000Z',
    ]);
  });
});
