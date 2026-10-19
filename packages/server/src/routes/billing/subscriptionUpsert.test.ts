import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {
  resolveSubscriptionUserId,
  upsertSubscription,
} from './subscriptionUpsert.js';
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

  test('reports outcomes: applied, invalid, and stale', async () => {
    const mockPlanFound = ((sql: string) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery;

    mockQuery.mockImplementation(mockPlanFound);
    await expect(
      upsertSubscription(makeEvent(), 'user-uuid-1', mockQuery),
    ).resolves.toBe('applied');

    // Missing price id: invalid before any query runs.
    mockQuery.mockReset();
    await expect(
      upsertSubscription(
        makeEvent({data: {...makeEvent().data, items: []}}),
        'user-uuid-1',
        mockQuery,
      ),
    ).resolves.toBe('invalid');
    expect(mockQuery.mock.calls).toHaveLength(0);

    // Unmapped status (paused): invalid, nothing written.
    mockQuery.mockImplementation(mockPlanFound);
    await expect(
      upsertSubscription(
        makeEvent({data: {...makeEvent().data, status: 'paused'}}),
        'user-uuid-1',
        mockQuery,
      ),
    ).resolves.toBe('invalid');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);

    // Older event than the stored state: stale.
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
    await expect(
      upsertSubscription(makeEvent(), 'user-uuid-1', mockQuery),
    ).resolves.toBe('stale');
  });

  test('applies against a native-Date stored timestamp (pg runtime shape)', async () => {
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
              paddle_subscription_id: 'sub_123',
              // pg returns timestamptz as a Date, not a string.
              paddle_last_event_at: new Date('2026-10-13T15:00:00.000Z'),
            },
          ]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    await expect(
      upsertSubscription(makeEvent(), 'user-uuid-1', mockQuery),
    ).resolves.toBe('applied');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(true);
  });

  test('snapshot mode: replacement applies, same-subscription revision still orders', async () => {
    const mockWithRow = (row: Record<string, unknown>) =>
      ((sql: string) => {
        if (sql.includes('from plan_prices')) {
          return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
        }
        if (sql.includes('from subscriptions')) {
          return Promise.resolve(makeQueryResult([row]));
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery;

    // Stored row is a DIFFERENT subscription with a far-future event
    // clock: a snapshot candidate is its replacement, not a stale
    // revision, so it applies.
    mockQuery.mockImplementation(
      mockWithRow({
        status: 'cancelled',
        past_due_since: null,
        paddle_subscription_id: 'sub_old',
        paddle_last_event_at: '2030-01-01T00:00:00.000Z',
      }),
    );
    await expect(
      upsertSubscription(makeEvent(), 'user-uuid-1', mockQuery, {
        snapshot: true,
      }),
    ).resolves.toBe('applied');

    // Without snapshot mode the same inputs stay stale (webhook path
    // keeps the global guard).
    await expect(
      upsertSubscription(makeEvent(), 'user-uuid-1', mockQuery),
    ).resolves.toBe('stale');

    // Snapshot of the SAME subscription with an older updated_at is a
    // stale revision and still loses.
    mockQuery.mockImplementation(
      mockWithRow({
        status: 'cancelled',
        past_due_since: null,
        paddle_subscription_id: 'sub_123',
        paddle_last_event_at: '2030-01-01T00:00:00.000Z',
      }),
    );
    await expect(
      upsertSubscription(makeEvent(), 'user-uuid-1', mockQuery, {
        snapshot: true,
      }),
    ).resolves.toBe('stale');

    // Replacement whose candidate timestamp is the later one keeps
    // the candidate's timestamp.
    mockQuery.mockImplementation(
      mockWithRow({
        status: 'cancelled',
        past_due_since: null,
        paddle_subscription_id: 'sub_old',
        paddle_last_event_at: '2026-10-18T00:00:00.000Z',
      }),
    );
    mockQuery.mockClear();
    await expect(
      upsertSubscription(
        makeEvent({occurred_at: '2026-10-19T00:00:00.000Z'}),
        'user-uuid-1',
        mockQuery,
        {snapshot: true},
      ),
    ).resolves.toBe('applied');
    expect(
      mockQuery.mock.calls.find(args =>
        args[0].includes('insert into subscriptions'),
      )?.[1]?.[10],
    ).toBe('2026-10-19T00:00:00.000Z');

    // A stored row with no subscription id (legacy) cannot be the
    // candidate's subscription either: replacement.
    mockQuery.mockImplementation(
      mockWithRow({
        status: 'active',
        past_due_since: null,
        paddle_subscription_id: null,
        paddle_last_event_at: '2030-01-01T00:00:00.000Z',
      }),
    );
    await expect(
      upsertSubscription(makeEvent(), 'user-uuid-1', mockQuery, {
        snapshot: true,
      }),
    ).resolves.toBe('applied');

    // Snapshot candidate without a subscription id cannot be the stored
    // subscription, so it also counts as a replacement.
    mockQuery.mockImplementation(
      mockWithRow({
        status: 'cancelled',
        past_due_since: null,
        paddle_subscription_id: 'sub_old',
        paddle_last_event_at: '2030-01-01T00:00:00.000Z',
      }),
    );
    await expect(
      upsertSubscription(
        makeEvent({data: {...makeEvent().data, id: undefined}}),
        'user-uuid-1',
        mockQuery,
        {snapshot: true},
      ),
    ).resolves.toBe('applied');
  });

  test('replacement never lowers the stored event clock (delayed old-sub guard)', async () => {
    let storedLast: string | null = '2026-10-18T00:00:00.000Z';
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(
          makeQueryResult([
            {
              status: 'cancelled',
              past_due_since: null,
              paddle_subscription_id: 'sub_old',
              paddle_last_event_at: storedLast,
            },
          ]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    // Refresh recovers sub_new (updated Oct 17) in place of sub_old
    // (canceled Oct 18): applies as a replacement, but the stored
    // event clock must stay at Oct 18, not drop to Oct 17.
    const replacement = makeEvent({
      occurred_at: '2026-10-17T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_new'},
    });
    await expect(
      upsertSubscription(replacement, 'user-uuid-1', mockQuery, {
        snapshot: true,
      }),
    ).resolves.toBe('applied');
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(insert?.[1]?.[10]).toBe('2026-10-18T00:00:00.000Z');
    storedLast = insert?.[1]?.[10] as string;

    // A delayed subscription.updated for sub_old dated Oct 18 then
    // arrives via webhook: not newer than the preserved clock, so it
    // cannot overwrite the replacement.
    mockQuery.mockClear();
    const delayedOld = makeEvent({
      occurred_at: '2026-10-18T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_old', status: 'canceled'},
    });
    await expect(
      upsertSubscription(delayedOld, 'user-uuid-1', mockQuery),
    ).resolves.toBe('stale');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);
  });

  test('snapshot past_due seeds the grace clock from the period start', async () => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const pastDue = makeEvent({
      data: {...makeEvent().data, status: 'past_due'},
    });

    await upsertSubscription(pastDue, 'user-uuid-1', mockQuery, {
      snapshot: true,
    });
    let insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    // Fixture period starts 2026-10-13: delinquency began then, not
    // at refresh time.
    expect(insert?.[1]?.[9]).toBe('2026-10-13T00:00:00.000Z');

    mockQuery.mockClear();
    await upsertSubscription(pastDue, 'user-uuid-1', mockQuery);
    insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    // Webhook path keeps stamping the transition time.
    expect(insert?.[1]?.[9]).not.toBe('2026-10-13T00:00:00.000Z');
    expect(
      Math.abs(Date.parse(insert?.[1]?.[9] as string) - Date.now()),
    ).toBeLessThan(60_000);

    // Snapshot without a billing period falls back to stamping now.
    mockQuery.mockClear();
    const noPeriod = makeEvent({
      data: {
        ...makeEvent().data,
        status: 'past_due',
        current_billing_period: undefined,
      },
    });
    await upsertSubscription(noPeriod, 'user-uuid-1', mockQuery, {
      snapshot: true,
    });
    insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(
      Math.abs(Date.parse(insert?.[1]?.[9] as string) - Date.now()),
    ).toBeLessThan(60_000);
  });

  test('snapshot replacement between past_due subscriptions uses its own grace clock', async () => {
    const mockWithPastDueRow = (subscriptionId: string, lastEventAt: string) =>
      ((sql: string) => {
        if (sql.includes('from plan_prices')) {
          return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
        }
        if (sql.includes('from subscriptions')) {
          return Promise.resolve(
            makeQueryResult([
              {
                status: 'past_due',
                past_due_since: '2026-10-01T00:00:00.000Z',
                paddle_subscription_id: subscriptionId,
                paddle_last_event_at: lastEventAt,
              },
            ]),
          );
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery;

    // Replacement (stored sub_old past_due since Oct 1; candidate
    // sub_new past_due with period start Oct 13): the candidate must
    // NOT inherit Oct 1 — that would end its grace immediately.
    mockQuery.mockImplementation(
      mockWithPastDueRow('sub_old', '2026-10-18T00:00:00.000Z'),
    );
    const replacement = makeEvent({
      occurred_at: '2026-10-17T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_new', status: 'past_due'},
    });
    await expect(
      upsertSubscription(replacement, 'user-uuid-1', mockQuery, {
        snapshot: true,
      }),
    ).resolves.toBe('applied');
    expect(
      mockQuery.mock.calls.find(args =>
        args[0].includes('insert into subscriptions'),
      )?.[1]?.[9],
    ).toBe('2026-10-13T00:00:00.000Z');

    // Same subscription in snapshot mode: the stored clock IS
    // preserved.
    mockQuery.mockClear();
    mockQuery.mockImplementation(
      mockWithPastDueRow('sub_123', '2026-10-10T00:00:00.000Z'),
    );
    const sameSub = makeEvent({
      data: {...makeEvent().data, status: 'past_due'},
    });
    await expect(
      upsertSubscription(sameSub, 'user-uuid-1', mockQuery, {snapshot: true}),
    ).resolves.toBe('applied');
    expect(
      mockQuery.mock.calls.find(args =>
        args[0].includes('insert into subscriptions'),
      )?.[1]?.[9],
    ).toBe('2026-10-01T00:00:00.000Z');
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

describe('resolveSubscriptionUserId Paddle customer lookup', () => {
  const realFetch = global.fetch;

  const mockLookups = (byEmailRow: unknown) => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from users where email')) {
        return Promise.resolve(makeQueryResult(byEmailRow ? [byEmailRow] : []));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
  };

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env['PADDLE_API_KEY'];
  });

  test('resolves via the Paddle customer email when the customer is unknown locally', async () => {
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    mockLookups({id: 'user-uuid-8'});
    global.fetch = async () =>
      ({
        ok: true,
        json: async () => ({data: {email: 'buyer@example.com'}}),
      }) as Response;
    await expect(
      resolveSubscriptionUserId(makeEvent(), mockQuery),
    ).resolves.toBe('user-uuid-8');
  });

  test('returns null when the Paddle lookup finds no matching user', async () => {
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    mockLookups(null);
    global.fetch = async () =>
      ({
        ok: true,
        json: async () => ({data: {email: 'stranger@example.com'}}),
      }) as Response;
    await expect(
      resolveSubscriptionUserId(makeEvent(), mockQuery),
    ).resolves.toBeNull();
  });

  test('returns null when the Paddle customer has no email', async () => {
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    mockLookups(null);
    global.fetch = async () =>
      ({ok: true, json: async () => ({data: {}})}) as Response;
    await expect(
      resolveSubscriptionUserId(makeEvent(), mockQuery),
    ).resolves.toBeNull();
  });

  test('returns null when the Paddle customer payload is empty', async () => {
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    mockLookups(null);
    global.fetch = async () => ({ok: true, json: async () => null}) as Response;
    await expect(
      resolveSubscriptionUserId(makeEvent(), mockQuery),
    ).resolves.toBeNull();
  });

  test('returns null when Paddle rejects the customer request', async () => {
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    mockLookups(null);
    global.fetch = async () =>
      ({ok: false, status: 404, json: async () => ({})}) as Response;
    await expect(
      resolveSubscriptionUserId(makeEvent(), mockQuery),
    ).resolves.toBeNull();
  });

  test('returns null when the Paddle customer email is empty', async () => {
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    mockLookups(null);
    global.fetch = async () =>
      ({ok: true, json: async () => ({data: {email: ''}})}) as Response;
    await expect(
      resolveSubscriptionUserId(makeEvent(), mockQuery),
    ).resolves.toBeNull();
  });

  test('returns null when the Paddle request rejects with a non-Error', async () => {
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    mockLookups(null);
    global.fetch = async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercising the non-Error catch path
      throw 'network down';
    };
    await expect(
      resolveSubscriptionUserId(makeEvent(), mockQuery),
    ).resolves.toBeNull();
  });

  test('returns null when the Paddle API request fails', async () => {
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    mockLookups(null);
    global.fetch = async () => {
      throw new Error('network down');
    };
    await expect(
      resolveSubscriptionUserId(makeEvent(), mockQuery),
    ).resolves.toBeNull();
  });

  test('returns null without calling Paddle when no API key is configured', async () => {
    mockLookups(null);
    let fetchCalled = false;
    global.fetch = async () => {
      fetchCalled = true;
      throw new Error('must not be called');
    };
    await expect(
      resolveSubscriptionUserId(makeEvent(), mockQuery),
    ).resolves.toBeNull();
    expect(fetchCalled).toBe(false);
  });
});
