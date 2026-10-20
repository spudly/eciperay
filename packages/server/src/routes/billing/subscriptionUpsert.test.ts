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
      if (sql.includes('insert into subscriptions')) {
        // A real insert/upsert affects one row.
        return Promise.resolve(makeQueryResult([{}]));
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
      if (sql.includes('insert into subscriptions')) {
        return Promise.resolve(makeQueryResult([{}]));
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
        if (sql.includes('insert into subscriptions')) {
          return Promise.resolve(makeQueryResult([{}]));
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery;

    // Snapshot replacements verify the candidate's live state at
    // write time: stub Paddle as still reporting sub_123 active at
    // the revision the snapshots claim.
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-13T16:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;

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

    global.fetch = realFetch;
    delete process.env['PADDLE_API_KEY'];
  });

  test('replacement keeps its own clock; superseded events order against theirs', async () => {
    let row = {
      status: 'cancelled',
      past_due_since: null as string | null,
      paddle_subscription_id: 'sub_old' as string | null,
      paddle_last_event_at: '2026-10-18T00:00:00.000Z' as string | null,
      superseded_subscription_id: null as string | null,
      superseded_last_event_at: null as string | null,
    };
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([row]));
      }
      if (sql.includes('insert into subscriptions')) {
        const p = params as unknown[];
        row = {
          ...row,
          status: p[2] as string,
          paddle_subscription_id: p[4] as string,
          paddle_last_event_at: p[10] as string,
          superseded_subscription_id: p[11] as string,
          superseded_last_event_at: p[12] as string,
        };
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    // Refresh recovers sub_new (updated Oct 17) in place of sub_old
    // (canceled Oct 18): the replacement is stamped with its OWN
    // timestamp, and the superseded slot records sub_old with its
    // Oct 18 clock. Snapshot replacements verify the candidate's
    // live state at write time — stub Paddle as still reporting
    // sub_new active at the claimed revision.
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-17T00:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    const replacement = makeEvent({
      occurred_at: '2026-10-17T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_new'},
    });
    await expect(
      upsertSubscription(replacement, 'user-uuid-1', mockQuery, {
        snapshot: true,
      }),
    ).resolves.toBe('applied');
    global.fetch = realFetch;
    delete process.env['PADDLE_API_KEY'];
    expect(row.paddle_subscription_id).toBe('sub_new');
    expect(row.paddle_last_event_at).toBe('2026-10-17T00:00:00.000Z');
    expect(row.superseded_subscription_id).toBe('sub_old');
    expect(row.superseded_last_event_at).toBe('2026-10-18T00:00:00.000Z');

    // A delayed subscription.updated for sub_old dated Oct 18 then
    // arrives via webhook: not newer than ITS OWN (superseded)
    // clock, so it cannot overwrite the replacement.
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

    // A genuinely newer sub_old revision (Oct 19) makes it current
    // again; sub_new becomes the superseded slot with its own clock.
    // Promoting a superseded subscription is verified live — stub
    // Paddle as confirming sub_old active at that revision.
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-19T00:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    const revived = makeEvent({
      occurred_at: '2026-10-19T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_old'},
    });
    await expect(
      upsertSubscription(revived, 'user-uuid-1', mockQuery),
    ).resolves.toBe('applied');
    global.fetch = realFetch;
    delete process.env['PADDLE_API_KEY'];
    expect(row.paddle_subscription_id).toBe('sub_old');
    expect(row.paddle_last_event_at).toBe('2026-10-19T00:00:00.000Z');
    expect(row.superseded_subscription_id).toBe('sub_new');
    expect(row.superseded_last_event_at).toBe('2026-10-17T00:00:00.000Z');
  });

  test('a newer webhook for a different subscription records the swap', async () => {
    // The takeover is verified live against Paddle first (see the
    // delayed-active regression below); stub the API as confirming
    // the new subscription is active.
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({data: {status: 'active'}}),
      }) as Response) as typeof fetch;
    try {
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
                paddle_subscription_id: 'sub_old',
                paddle_last_event_at: '2026-10-10T00:00:00.000Z',
              },
            ]),
          );
        }
        if (sql.includes('insert into subscriptions')) {
          return Promise.resolve(makeQueryResult([{}]));
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery);
      const newer = makeEvent({
        occurred_at: '2026-10-13T16:00:00.000Z',
        data: {...makeEvent().data, id: 'sub_new'},
      });
      await expect(
        upsertSubscription(newer, 'user-uuid-1', mockQuery),
      ).resolves.toBe('applied');
      const insert = mockQuery.mock.calls.find(args =>
        args[0].includes('insert into subscriptions'),
      );
      expect(insert?.[1]?.[11]).toBe('sub_old');
      expect(insert?.[1]?.[12]).toBe('2026-10-10T00:00:00.000Z');
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('snapshot can reselect a superseded subscription at an equal revision', async () => {
    let row = {
      status: 'cancelled',
      past_due_since: null as string | null,
      paddle_subscription_id: 'sub_b' as string | null,
      paddle_last_event_at: '2026-10-18T00:00:00.000Z' as string | null,
      superseded_subscription_id: 'sub_a' as string | null,
      superseded_last_event_at: '2026-10-15T00:00:00.000Z' as string | null,
    };
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([row]));
      }
      if (sql.includes('insert into subscriptions')) {
        const p = params as unknown[];
        row = {
          ...row,
          status: p[2] as string,
          paddle_subscription_id: p[4] as string,
          paddle_last_event_at: p[10] as string,
          superseded_subscription_id: p[11] as string,
          superseded_last_event_at: p[12] as string,
        };
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    // sub_b (current) was canceled Oct 18; sub_a stayed active and
    // unchanged since Oct 15. Refresh selects sub_a: its revision
    // EQUALS its superseded clock, and it must still be reselected —
    // otherwise canceled sub_b stays current forever. Reselection
    // verifies the candidate live — stub Paddle as still reporting
    // sub_a active at the claimed revision.
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-15T00:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    try {
      const reselect = makeEvent({
        occurred_at: '2026-10-15T00:00:00.000Z',
        data: {...makeEvent().data, id: 'sub_a'},
      });
      await expect(
        upsertSubscription(reselect, 'user-uuid-1', mockQuery, {
          snapshot: true,
        }),
      ).resolves.toBe('applied');
      expect(row.paddle_subscription_id).toBe('sub_a');
      expect(row.superseded_subscription_id).toBe('sub_b');
      expect(row.superseded_last_event_at).toBe('2026-10-18T00:00:00.000Z');

      // A snapshot OLDER than the superseded clock is still stale.
      const older = makeEvent({
        occurred_at: '2026-10-17T00:00:00.000Z',
        data: {...makeEvent().data, id: 'sub_b', status: 'canceled'},
      });
      await expect(
        upsertSubscription(older, 'user-uuid-1', mockQuery, {snapshot: true}),
      ).resolves.toBe('stale');
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('a newer canceled revision of a superseded subscription only advances its clock', async () => {
    let row = {
      status: 'active',
      past_due_since: null as string | null,
      paddle_subscription_id: 'sub_new' as string | null,
      paddle_last_event_at: '2026-10-17T00:00:00.000Z' as string | null,
      superseded_subscription_id: 'sub_old' as string | null,
      superseded_last_event_at: '2026-10-16T00:00:00.000Z' as string | null,
    };
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([row]));
      }
      if (sql.includes('set superseded_last_event_at')) {
        row = {...row, superseded_last_event_at: params?.[1] as string};
        return Promise.resolve(makeQueryResult([{}]));
      }
      if (sql.includes('insert into subscriptions')) {
        const p = params as unknown[];
        row = {
          ...row,
          status: p[2] as string,
          paddle_subscription_id: p[4] as string,
          paddle_last_event_at: p[10] as string,
          superseded_subscription_id: p[11] as string,
          superseded_last_event_at: p[12] as string,
        };
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    // An older live revision of sub_old is simply stale.
    const staleOld = makeEvent({
      occurred_at: '2026-10-15T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_old'},
    });
    await expect(
      upsertSubscription(staleOld, 'user-uuid-1', mockQuery),
    ).resolves.toBe('stale');
    expect(row.paddle_subscription_id).toBe('sub_new');
    expect(row.superseded_last_event_at).toBe('2026-10-16T00:00:00.000Z');

    // sub_old's cancellation at Oct 18 advanced its clock past the
    // superseded Oct 16 — but a canceled revision must not replace
    // the active sub_new. Only the superseded clock advances.
    const canceledOld = makeEvent({
      occurred_at: '2026-10-18T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_old', status: 'canceled'},
    });
    await expect(
      upsertSubscription(canceledOld, 'user-uuid-1', mockQuery),
    ).resolves.toBe('applied');
    expect(row.paddle_subscription_id).toBe('sub_new');
    expect(row.status).toBe('active');
    expect(row.superseded_last_event_at).toBe('2026-10-18T00:00:00.000Z');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);

    // Control: a newer ACTIVE revision of sub_old does take over
    // again. Promoting a superseded subscription is verified live —
    // stub Paddle as confirming sub_old active at that revision.
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-19T00:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    const revivedOld = makeEvent({
      occurred_at: '2026-10-19T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_old'},
    });
    await expect(
      upsertSubscription(revivedOld, 'user-uuid-1', mockQuery),
    ).resolves.toBe('applied');
    global.fetch = realFetch;
    delete process.env['PADDLE_API_KEY'];
    expect(row.paddle_subscription_id).toBe('sub_old');
    expect(row.superseded_subscription_id).toBe('sub_new');
    expect(row.superseded_last_event_at).toBe('2026-10-17T00:00:00.000Z');
  });

  test('delayed cancellation for a two-generations-old subscription cannot replace the current one', async () => {
    let row = {
      status: 'active',
      past_due_since: null as string | null,
      paddle_subscription_id: 'sub_a' as string | null,
      paddle_last_event_at: '2026-10-10T00:00:00.000Z' as string | null,
      superseded_subscription_id: null as string | null,
      superseded_last_event_at: null as string | null,
    };
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([row]));
      }
      if (sql.includes('insert into subscriptions')) {
        const p = params as unknown[];
        row = {
          ...row,
          status: p[2] as string,
          paddle_subscription_id: p[4] as string,
          paddle_last_event_at: p[10] as string,
          superseded_subscription_id: p[11] as string,
          superseded_last_event_at: p[12] as string,
        };
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const snapshotFor = (id: string, occurredAt: string) =>
      upsertSubscription(
        makeEvent({occurred_at: occurredAt, data: {...makeEvent().data, id}}),
        'user-uuid-1',
        mockQuery,
        {snapshot: true},
      );

    // Snapshot replacements verify the candidate's live state at
    // write time — stub Paddle as still reporting the candidates
    // active at an older revision.
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-10T00:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;

    // A -> B -> C: after two replacements only B fits the superseded
    // slot; A is forgotten.
    await expect(
      snapshotFor('sub_b', '2026-10-11T00:00:00.000Z'),
    ).resolves.toBe('applied');
    await expect(
      snapshotFor('sub_c', '2026-10-12T00:00:00.000Z'),
    ).resolves.toBe('applied');
    expect(row.paddle_subscription_id).toBe('sub_c');
    expect(row.superseded_subscription_id).toBe('sub_b');

    // A delayed canceled update for A dated Oct 13 — newer than C's
    // clock — must not replace the active C: A is untracked, and a
    // non-active state never overwrites the selected subscription.
    mockQuery.mockClear();
    const delayedA = makeEvent({
      occurred_at: '2026-10-13T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_a', status: 'canceled'},
    });
    await expect(
      upsertSubscription(delayedA, 'user-uuid-1', mockQuery),
    ).resolves.toBe('stale');
    expect(row.paddle_subscription_id).toBe('sub_c');
    expect(row.status).toBe('active');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);

    global.fetch = realFetch;
    delete process.env['PADDLE_API_KEY'];
  });

  test('a newer past_due revision of a superseded subscription only advances its clock', async () => {
    let row = {
      status: 'active',
      past_due_since: null as string | null,
      paddle_subscription_id: 'sub_new' as string | null,
      paddle_last_event_at: '2026-10-17T00:00:00.000Z' as string | null,
      superseded_subscription_id: 'sub_old' as string | null,
      superseded_last_event_at: '2026-10-16T00:00:00.000Z' as string | null,
    };
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([row]));
      }
      if (sql.includes('set superseded_last_event_at')) {
        row = {...row, superseded_last_event_at: params?.[1] as string};
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const pastDueOld = makeEvent({
      occurred_at: '2026-10-18T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_old', status: 'past_due'},
    });
    await expect(
      upsertSubscription(pastDueOld, 'user-uuid-1', mockQuery),
    ).resolves.toBe('applied');
    // The active replacement is untouched; only the superseded
    // clock moved.
    expect(row.paddle_subscription_id).toBe('sub_new');
    expect(row.status).toBe('active');
    expect(row.superseded_last_event_at).toBe('2026-10-18T00:00:00.000Z');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);
  });

  test('delayed active webhook for a two-generations-old subscription fails live verification', async () => {
    let row = {
      status: 'active',
      past_due_since: null as string | null,
      paddle_subscription_id: 'sub_a' as string | null,
      paddle_last_event_at: '2026-10-10T00:00:00.000Z' as string | null,
      superseded_subscription_id: null as string | null,
      superseded_last_event_at: null as string | null,
    };
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([row]));
      }
      if (sql.includes('insert into subscriptions')) {
        const p = params as unknown[];
        row = {
          ...row,
          status: p[2] as string,
          paddle_subscription_id: p[4] as string,
          paddle_last_event_at: p[10] as string,
          superseded_subscription_id: p[11] as string,
          superseded_last_event_at: p[12] as string,
        };
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const snapshotFor = (id: string, occurredAt: string) =>
      upsertSubscription(
        makeEvent({occurred_at: occurredAt, data: {...makeEvent().data, id}}),
        'user-uuid-1',
        mockQuery,
        {snapshot: true},
      );
    // Snapshot replacements verify the candidate's live state at
    // write time — stub Paddle as still reporting the candidates
    // active at an older revision. (The verification section below
    // re-stubs fetch for its own cases and its finally restores
    // this stub; delete the key here only if that section's cleanup
    // has not run — it deletes it too, which is idempotent.)
    const snapshotRealFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-10T00:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    await snapshotFor('sub_b', '2026-10-11T00:00:00.000Z');
    await snapshotFor('sub_c', '2026-10-14T00:00:00.000Z');
    expect(row.paddle_subscription_id).toBe('sub_c');
    global.fetch = snapshotRealFetch;

    // sub_a was canceled Oct 18, but an unseen ACTIVE revision of it
    // from Oct 17 now arrives — newer than sub_c's Oct 14 clock, so
    // the stored clocks alone would promote it. Live verification
    // asks Paddle, which reports sub_a canceled: no promotion.
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({data: {status: 'canceled'}}),
      }) as Response) as typeof fetch;
    try {
      mockQuery.mockClear();
      const delayedActive = makeEvent({
        occurred_at: '2026-10-17T00:00:00.000Z',
        data: {...makeEvent().data, id: 'sub_a'},
      });
      await expect(
        upsertSubscription(delayedActive, 'user-uuid-1', mockQuery),
      ).resolves.toBe('stale');
      expect(row.paddle_subscription_id).toBe('sub_c');
      expect(
        mockQuery.mock.calls.some(args =>
          args[0].includes('insert into subscriptions'),
        ),
      ).toBe(false);

      // And when the verification request itself fails, the claim
      // is not promoted either — but it is NOT acknowledged as
      // stale: a transient 503 says nothing about the subscription,
      // so the upsert throws and the webhook stays retryable rather
      // than recording the event and dropping a genuine takeover.
      global.fetch = (async () =>
        ({
          ok: false,
          status: 503,
          json: async () => ({}),
        }) as Response) as typeof fetch;
      mockQuery.mockClear();
      await expect(
        upsertSubscription(delayedActive, 'user-uuid-1', mockQuery),
      ).rejects.toThrow('Paddle live verification unavailable');
      expect(row.paddle_subscription_id).toBe('sub_c');
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('snapshot replacement is rejected when the candidate was canceled after the list was fetched', async () => {
    // Stored: sub_c current, sub_b superseded. Refresh fetched
    // sub_a as active, but sub_a's cancellation then committed via
    // a webhook — sub_a being untracked, that path retained no
    // revision for it, so the stored slots cannot detect the
    // cancellation. Installing the older active snapshot would
    // reactivate a canceled subscription; the write-time live
    // check sees Paddle reporting sub_a canceled at a newer
    // revision and rejects the snapshot as stale.
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
              paddle_subscription_id: 'sub_c',
              paddle_last_event_at: '2026-10-14T00:00:00.000Z',
              superseded_subscription_id: 'sub_b',
              superseded_last_event_at: '2026-10-12T00:00:00.000Z',
            },
          ]),
        );
      }
      if (sql.includes('insert into subscriptions')) {
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'canceled', updated_at: '2026-10-18T00:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    try {
      const snapshot = makeEvent({
        occurred_at: '2026-10-17T00:00:00.000Z',
        data: {...makeEvent().data, id: 'sub_a'},
      });
      await expect(
        upsertSubscription(snapshot, 'user-uuid-1', mockQuery, {
          snapshot: true,
        }),
      ).resolves.toBe('stale');
      expect(
        mockQuery.mock.calls.some(args =>
          args[0].includes('insert into subscriptions'),
        ),
      ).toBe(false);
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('delayed active event is stale when Paddle reports a newer live revision', async () => {
    // sub_a's Oct 17 revision (carrying its pre-downgrade price)
    // arrives late. The Oct 18 downgrade was already processed and
    // sub_a was later superseded, so no stored clock covers it —
    // the event is newer than the current subscription's clock and
    // Paddle still reports sub_a ACTIVE, so status-only checks
    // pass. But the live revision (Oct 18) is newer than the
    // event's (Oct 17): the event is historical, and applying it
    // would restore the old price, undoing the downgrade.
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
              paddle_subscription_id: 'sub_c',
              paddle_last_event_at: '2026-10-14T00:00:00.000Z',
              superseded_subscription_id: 'sub_b',
              superseded_last_event_at: '2026-10-12T00:00:00.000Z',
            },
          ]),
        );
      }
      if (sql.includes('insert into subscriptions')) {
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    let liveUpdatedAt = '2026-10-18T00:00:00.000Z';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: liveUpdatedAt},
        }),
      }) as Response) as typeof fetch;
    try {
      const delayed = makeEvent({
        occurred_at: '2026-10-17T00:00:00.000Z',
        data: {...makeEvent().data, id: 'sub_a'},
      });
      await expect(
        upsertSubscription(delayed, 'user-uuid-1', mockQuery),
      ).resolves.toBe('stale');
      expect(
        mockQuery.mock.calls.some(args =>
          args[0].includes('insert into subscriptions'),
        ),
      ).toBe(false);

      // At the live revision the event claims (equal, not newer),
      // the same takeover is genuine and applies.
      liveUpdatedAt = '2026-10-17T00:00:00.000Z';
      await expect(
        upsertSubscription(delayed, 'user-uuid-1', mockQuery),
      ).resolves.toBe('applied');
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('snapshot reselect tolerates a legacy occurred_at clock in the superseded slot', async () => {
    // Pre-upgrade row shape: sub_a was superseded before webhook
    // writes switched to stamping the entity updated_at, so the
    // superseded slot holds sub_a's legacy occurred_at clock
    // (.100) while sub_a's own revision (updated_at) is .000.
    // sub_b (current) has since been canceled; refresh reselects
    // the unchanged, still-active sub_a. Without the legacy-skew
    // tolerance the .000 candidate reads as older than the .100
    // slot clock and is rejected on every pass, stranding the
    // paying user on Free.
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
              paddle_subscription_id: 'sub_b',
              paddle_last_event_at: '2026-10-19T00:00:00.000Z',
              superseded_subscription_id: 'sub_a',
              superseded_last_event_at: '2026-10-18T12:00:00.100Z',
            },
          ]),
        );
      }
      if (sql.includes('insert into subscriptions')) {
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    // Reselection verifies the candidate live — stub Paddle as
    // still reporting sub_a active at its own revision (.000).
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-18T12:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    try {
      const reselect = makeEvent({
        occurred_at: '2026-10-18T12:00:00.100Z',
        data: {
          ...makeEvent().data,
          id: 'sub_a',
          updated_at: '2026-10-18T12:00:00.000Z',
        },
      });
      await expect(
        upsertSubscription(reselect, 'user-uuid-1', mockQuery, {
          snapshot: true,
        }),
      ).resolves.toBe('applied');

      // A genuinely older revision of sub_a (an hour before the slot
      // clock — far beyond event-creation skew) is still stale.
      mockQuery.mockClear();
      const older = makeEvent({
        occurred_at: '2026-10-18T11:00:00.000Z',
        data: {
          ...makeEvent().data,
          id: 'sub_a',
          updated_at: '2026-10-18T11:00:00.000Z',
        },
      });
      await expect(
        upsertSubscription(older, 'user-uuid-1', mockQuery, {snapshot: true}),
      ).resolves.toBe('stale');
      expect(
        mockQuery.mock.calls.some(args =>
          args[0].includes('insert into subscriptions'),
        ),
      ).toBe(false);
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('equal-revision snapshot persists the state a status-only write left partial', async () => {
    // An immediate cancellation was processed by the status-only
    // handler first: it stamped the revision clock and the
    // cancelled status but left the billing period at its old
    // future end. Refresh's snapshot of the SAME revision carries
    // the complete state (no billing period — access has ended).
    // Rejecting it as an equal revision would retain the stale
    // period end and keep granting paid access; persisting it
    // completes the revision. Webhooks keep the strict no-op: an
    // equal-revision event is a duplicate delta, not full state.
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
              paddle_subscription_id: 'sub_123',
              paddle_last_event_at: '2026-10-17T00:00:00.000Z',
            },
          ]),
        );
      }
      if (sql.includes('insert into subscriptions')) {
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const snapshot = makeEvent({
      occurred_at: '2026-10-17T00:00:00.000Z',
      data: {
        ...makeEvent().data,
        status: 'canceled',
        updated_at: '2026-10-17T00:00:00.000Z',
        current_billing_period: undefined,
      },
    });
    await expect(
      upsertSubscription(snapshot, 'user-uuid-1', mockQuery, {snapshot: true}),
    ).resolves.toBe('applied');
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    // current_period_end is bind $8: the snapshot's null replaces
    // the stale future end.
    expect(insert?.[1]?.[7]).toBeNull();

    mockQuery.mockClear();
    await expect(
      upsertSubscription(snapshot, 'user-uuid-1', mockQuery),
    ).resolves.toBe('stale');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);
  });

  test('delayed active promotion of a superseded subscription fails live verification', async () => {
    // sub_old is superseded (clock Oct 15); sub_new is current. A
    // delayed ACTIVE revision of sub_old dated Oct 17 passes the
    // superseded clock — but sub_old was canceled on Oct 19 and
    // that webhook was lost. Promoting on clocks alone would
    // replace sub_new with an obsolete active plan. The promotion
    // is verified live, like any other takeover.
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
              paddle_subscription_id: 'sub_new',
              paddle_last_event_at: '2026-10-17T00:00:00.000Z',
              superseded_subscription_id: 'sub_old',
              superseded_last_event_at: '2026-10-15T00:00:00.000Z',
            },
          ]),
        );
      }
      if (sql.includes('insert into subscriptions')) {
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    let livePayload: Record<string, unknown> = {};
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({data: livePayload}),
      }) as Response) as typeof fetch;
    try {
      const delayed = makeEvent({
        occurred_at: '2026-10-17T00:00:00.000Z',
        data: {...makeEvent().data, id: 'sub_old'},
      });
      // Live state: canceled since Oct 19 — no promotion.
      livePayload = {
        status: 'canceled',
        updated_at: '2026-10-19T00:00:00.000Z',
      };
      await expect(
        upsertSubscription(delayed, 'user-uuid-1', mockQuery),
      ).resolves.toBe('stale');
      // Live state: still active, but at a NEWER revision than the
      // event claims — the event is historical; no promotion.
      livePayload = {status: 'active', updated_at: '2026-10-18T00:00:00.000Z'};
      await expect(
        upsertSubscription(delayed, 'user-uuid-1', mockQuery),
      ).resolves.toBe('stale');
      expect(
        mockQuery.mock.calls.some(args =>
          args[0].includes('insert into subscriptions'),
        ),
      ).toBe(false);
      // Live state: active at exactly the event's revision — the
      // promotion is genuine and applies.
      livePayload = {status: 'active', updated_at: '2026-10-17T00:00:00.000Z'};
      await expect(
        upsertSubscription(delayed, 'user-uuid-1', mockQuery),
      ).resolves.toBe('applied');
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('snapshot writes refuse when the selection moved mid-flight', async () => {
    // The snapshot caller vouches for the selection its list was
    // based on via knownSelectionIds. If the row's current
    // subscription is outside that set, a webhook installed a
    // subscription the list never contained (e.g. a newly
    // activated one) while the caller was deciding — replacing it
    // from the stale list could strand the new subscription.
    const mockWithRow = (row: Record<string, unknown>) =>
      ((sql: string) => {
        if (sql.includes('from plan_prices')) {
          return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
        }
        if (sql.includes('from subscriptions')) {
          return Promise.resolve(makeQueryResult([row]));
        }
        if (sql.includes('insert into subscriptions')) {
          return Promise.resolve(makeQueryResult([{}]));
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery;

    // Replacement branch: stored sub_c was never in the caller's
    // list ({sub_a} plus the pre-fetch selection sub_old).
    mockQuery.mockImplementation(
      mockWithRow({
        status: 'active',
        past_due_since: null,
        paddle_subscription_id: 'sub_c',
        paddle_last_event_at: '2026-10-14T00:00:00.000Z',
        superseded_subscription_id: null,
        superseded_last_event_at: null,
      }),
    );
    await expect(
      upsertSubscription(makeEvent(), 'user-uuid-1', mockQuery, {
        snapshot: true,
        knownSelectionIds: new Set(['sub_a', 'sub_old']),
      }),
    ).resolves.toBe('stale');

    // Superseded-reselect branch: the candidate IS the superseded
    // subscription, but the current one (sub_b) is outside the set.
    mockQuery.mockImplementation(
      mockWithRow({
        status: 'active',
        past_due_since: null,
        paddle_subscription_id: 'sub_b',
        paddle_last_event_at: '2026-10-19T00:00:00.000Z',
        superseded_subscription_id: 'sub_a',
        superseded_last_event_at: '2026-10-12T00:00:00.000Z',
      }),
    );
    const reselect = makeEvent({
      occurred_at: '2026-10-12T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_a'},
    });
    await expect(
      upsertSubscription(reselect, 'user-uuid-1', mockQuery, {
        snapshot: true,
        knownSelectionIds: new Set(['sub_a']),
      }),
    ).resolves.toBe('stale');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);

    // Control: with sub_b in the caller's known set, the same
    // reselection applies. Reselection verifies the candidate
    // live — stub Paddle as still reporting sub_a active at the
    // claimed revision.
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-12T00:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    try {
      await expect(
        upsertSubscription(reselect, 'user-uuid-1', mockQuery, {
          snapshot: true,
          knownSelectionIds: new Set(['sub_a', 'sub_b']),
        }),
      ).resolves.toBe('applied');
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('snapshot reselection is rejected when the superseded candidate was canceled after listing', async () => {
    // Stored: sub_b current (canceled Oct 19), sub_a superseded at
    // Oct 15. Refresh listed sub_a as active, but Paddle canceled
    // sub_a after the list was fetched and that cancellation
    // webhook was lost — sub_a's superseded clock never moved, so
    // the clocks alone cannot detect it. Reselecting would replace
    // sub_b with obsolete active sub_a and return 'applied', so
    // refresh would never re-fetch. The reselection verifies the
    // candidate live, like the replacement branch does.
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
              paddle_subscription_id: 'sub_b',
              paddle_last_event_at: '2026-10-19T00:00:00.000Z',
              superseded_subscription_id: 'sub_a',
              superseded_last_event_at: '2026-10-15T00:00:00.000Z',
            },
          ]),
        );
      }
      if (sql.includes('insert into subscriptions')) {
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    let livePayload: Record<string, unknown> = {};
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({data: livePayload}),
      }) as Response) as typeof fetch;
    try {
      const reselect = makeEvent({
        occurred_at: '2026-10-15T00:00:00.000Z',
        data: {...makeEvent().data, id: 'sub_a'},
      });
      // Live state: canceled after listing — no reselection.
      livePayload = {
        status: 'canceled',
        updated_at: '2026-10-20T00:00:00.000Z',
      };
      await expect(
        upsertSubscription(reselect, 'user-uuid-1', mockQuery, {
          snapshot: true,
        }),
      ).resolves.toBe('stale');
      // Live state: still active, but at a NEWER revision than the
      // snapshot claims — the snapshot is historical; no reselection.
      livePayload = {status: 'active', updated_at: '2026-10-16T00:00:00.000Z'};
      await expect(
        upsertSubscription(reselect, 'user-uuid-1', mockQuery, {
          snapshot: true,
        }),
      ).resolves.toBe('stale');
      expect(
        mockQuery.mock.calls.some(args =>
          args[0].includes('insert into subscriptions'),
        ),
      ).toBe(false);
      // Verification unavailable: throw, so refresh surfaces a
      // retryable error instead of installing unverified state.
      global.fetch = (async () =>
        ({
          ok: false,
          status: 503,
          json: async () => ({}),
        }) as Response) as typeof fetch;
      await expect(
        upsertSubscription(reselect, 'user-uuid-1', mockQuery, {
          snapshot: true,
        }),
      ).rejects.toThrow('Paddle live verification unavailable');
      // Control: live state still active at exactly the snapshot's
      // revision — the reselection applies.
      global.fetch = (async () =>
        ({
          ok: true,
          json: async () => ({
            data: {status: 'active', updated_at: '2026-10-15T00:00:00.000Z'},
          }),
        }) as Response) as typeof fetch;
      await expect(
        upsertSubscription(reselect, 'user-uuid-1', mockQuery, {
          snapshot: true,
        }),
      ).resolves.toBe('applied');
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('snapshot writes refuse when a listed current subscription changed mid-flight', async () => {
    // The id-only guard vouches for WHICH subscriptions the caller
    // saw; this guard vouches for the STATE it saw them in. Refresh
    // listed sub_b as paused (Oct 17) and sub_a as canceled; sub_b's
    // resume webhook then committed (active, Oct 19) before the
    // canceled candidate's write. sub_b IS in the known ids, and
    // checking the candidate's own live state cannot see sub_b's
    // change — without the listed-state validation, canceled sub_a
    // replaces newly active sub_b and the user returns to Free.
    const mockWithRow = (row: Record<string, unknown>) =>
      ((sql: string) => {
        if (sql.includes('from plan_prices')) {
          return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
        }
        if (sql.includes('from subscriptions')) {
          return Promise.resolve(makeQueryResult([row]));
        }
        if (sql.includes('insert into subscriptions')) {
          return Promise.resolve(makeQueryResult([{}]));
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery;
    const canceledA = makeEvent({
      occurred_at: '2026-10-16T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_a', status: 'canceled'},
    });
    const listedState = new Map([
      ['sub_a', {status: 'canceled', updatedAt: '2026-10-16T00:00:00.000Z'}],
      ['sub_b', {status: 'paused', updatedAt: '2026-10-17T00:00:00.000Z'}],
    ]);

    // Replacement branch: stored sub_b no longer matches its
    // listed state (paused @ Oct 17 -> active @ Oct 19).
    mockQuery.mockImplementation(
      mockWithRow({
        status: 'active',
        past_due_since: null,
        paddle_subscription_id: 'sub_b',
        paddle_last_event_at: '2026-10-19T00:00:00.000Z',
        superseded_subscription_id: null,
        superseded_last_event_at: null,
      }),
    );
    await expect(
      upsertSubscription(canceledA, 'user-uuid-1', mockQuery, {
        snapshot: true,
        knownSelectionIds: new Set(['sub_a', 'sub_b']),
        knownSelectionState: listedState,
      }),
    ).resolves.toBe('stale');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);

    // Superseded-reselect branch: the candidate is the superseded
    // sub_a, but the current sub_b changed the same way — the
    // reselection is refused before its own live check.
    mockQuery.mockImplementation(
      mockWithRow({
        status: 'active',
        past_due_since: null,
        paddle_subscription_id: 'sub_b',
        paddle_last_event_at: '2026-10-19T00:00:00.000Z',
        superseded_subscription_id: 'sub_a',
        superseded_last_event_at: '2026-10-15T00:00:00.000Z',
      }),
    );
    const reselectA = makeEvent({
      occurred_at: '2026-10-15T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_a'},
    });
    await expect(
      upsertSubscription(reselectA, 'user-uuid-1', mockQuery, {
        snapshot: true,
        knownSelectionIds: new Set(['sub_a', 'sub_b']),
        knownSelectionState: listedState,
      }),
    ).resolves.toBe('stale');

    // Control: the stored row still matches sub_b's listed state
    // (paused is unmapped, so the row holds its pre-pause active
    // state at the listed revision) — the same replacement applies.
    // The replacement branch verifies the candidate live; stub
    // Paddle as still reporting sub_a canceled at its revision.
    mockQuery.mockImplementation(
      mockWithRow({
        status: 'active',
        past_due_since: null,
        paddle_subscription_id: 'sub_b',
        paddle_last_event_at: '2026-10-17T00:00:00.000Z',
        superseded_subscription_id: null,
        superseded_last_event_at: null,
      }),
    );
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'canceled', updated_at: '2026-10-16T00:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    try {
      await expect(
        upsertSubscription(canceledA, 'user-uuid-1', mockQuery, {
          snapshot: true,
          knownSelectionIds: new Set(['sub_a', 'sub_b']),
          knownSelectionState: listedState,
        }),
      ).resolves.toBe('applied');
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('snapshot writes revalidate the current subscription when its clock is within the skew window', async () => {
    // The listed-state guard tolerates a stored clock up to the
    // legacy skew (2s) past the listed revision — but a genuine
    // revision can land inside that window too: listed paused B at
    // 10:00:00, resume webhook stores active B at 10:00:01. Clocks
    // cannot tell that from a legacy occurred_at clock, so both
    // snapshot replacement branches revalidate the CURRENT
    // subscription live when the difference is inside the window.
    const mockWithRow = (row: Record<string, unknown>) =>
      ((sql: string) => {
        if (sql.includes('from plan_prices')) {
          return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
        }
        if (sql.includes('from subscriptions')) {
          return Promise.resolve(makeQueryResult([row]));
        }
        if (sql.includes('insert into subscriptions')) {
          return Promise.resolve(makeQueryResult([{}]));
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery;
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    let liveById: Record<string, {status: string; updated_at: string} | null> =
      {};
    global.fetch = (async (url: unknown) => {
      const id = String(url).split('/subscriptions/')[1] ?? '';
      const payload = liveById[id];
      if (!payload) {
        return {ok: false, status: 503, json: async () => ({})} as Response;
      }
      return {ok: true, json: async () => ({data: payload})} as Response;
    }) as typeof fetch;
    const canceledA = makeEvent({
      occurred_at: '2026-10-16T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_a', status: 'canceled'},
    });
    const reselectA = makeEvent({
      occurred_at: '2026-10-15T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_a'},
    });
    try {
      // Replacement branch, genuine sub-2s change: stored sub_b
      // resumed at 10:00:01, one second after the listed pause.
      // Live revalidation shows sub_b active at a newer revision
      // than listed — the canceled candidate must not replace it.
      mockQuery.mockImplementation(
        mockWithRow({
          status: 'active',
          past_due_since: null,
          paddle_subscription_id: 'sub_b',
          paddle_last_event_at: '2026-10-20T10:00:01.000Z',
          superseded_subscription_id: null,
          superseded_last_event_at: null,
        }),
      );
      liveById = {
        sub_b: {status: 'active', updated_at: '2026-10-20T10:00:01.000Z'},
      };
      await expect(
        upsertSubscription(canceledA, 'user-uuid-1', mockQuery, {
          snapshot: true,
          knownSelectionIds: new Set(['sub_a', 'sub_b']),
          knownSelectionState: new Map([
            [
              'sub_b',
              {status: 'paused', updatedAt: '2026-10-20T10:00:00.000Z'},
            ],
            [
              'sub_a',
              {status: 'canceled', updatedAt: '2026-10-16T00:00:00.000Z'},
            ],
          ]),
        }),
      ).resolves.toBe('stale');
      expect(
        mockQuery.mock.calls.some(args =>
          args[0].includes('insert into subscriptions'),
        ),
      ).toBe(false);

      // Replacement branch, legacy skew: the stored clock is a
      // pre-upgrade occurred_at stamp 100ms past the listed
      // revision; live state still matches the listing exactly, so
      // the replacement proceeds (the candidate's own live check
      // also runs).
      mockQuery.mockClear();
      mockQuery.mockImplementation(
        mockWithRow({
          status: 'active',
          past_due_since: null,
          paddle_subscription_id: 'sub_b',
          paddle_last_event_at: '2026-10-20T10:00:00.100Z',
          superseded_subscription_id: null,
          superseded_last_event_at: null,
        }),
      );
      liveById = {
        sub_b: {status: 'active', updated_at: '2026-10-20T10:00:00.000Z'},
        sub_a: {status: 'canceled', updated_at: '2026-10-16T00:00:00.000Z'},
      };
      await expect(
        upsertSubscription(canceledA, 'user-uuid-1', mockQuery, {
          snapshot: true,
          knownSelectionIds: new Set(['sub_a', 'sub_b']),
          knownSelectionState: new Map([
            [
              'sub_b',
              {status: 'active', updatedAt: '2026-10-20T10:00:00.000Z'},
            ],
            [
              'sub_a',
              {status: 'canceled', updatedAt: '2026-10-16T00:00:00.000Z'},
            ],
          ]),
        }),
      ).resolves.toBe('applied');

      // Superseded-reselect branch, genuine sub-2s change: the
      // current sub_b changed inside the window, so reselecting
      // the superseded candidate is refused before its own check.
      mockQuery.mockClear();
      mockQuery.mockImplementation(
        mockWithRow({
          status: 'active',
          past_due_since: null,
          paddle_subscription_id: 'sub_b',
          paddle_last_event_at: '2026-10-20T10:00:01.000Z',
          superseded_subscription_id: 'sub_a',
          superseded_last_event_at: '2026-10-15T00:00:00.000Z',
        }),
      );
      liveById = {
        sub_b: {status: 'active', updated_at: '2026-10-20T10:00:01.000Z'},
      };
      await expect(
        upsertSubscription(reselectA, 'user-uuid-1', mockQuery, {
          snapshot: true,
          knownSelectionIds: new Set(['sub_a', 'sub_b']),
          knownSelectionState: new Map([
            [
              'sub_b',
              {status: 'paused', updatedAt: '2026-10-20T10:00:00.000Z'},
            ],
            [
              'sub_a',
              {status: 'active', updatedAt: '2026-10-15T00:00:00.000Z'},
            ],
          ]),
        }),
      ).resolves.toBe('stale');
      expect(
        mockQuery.mock.calls.some(args =>
          args[0].includes('insert into subscriptions'),
        ),
      ).toBe(false);

      // Superseded-reselect branch, legacy skew: live state
      // matches the listing, and the candidate verifies live at
      // its own revision — the reselection applies.
      mockQuery.mockImplementation(
        mockWithRow({
          status: 'cancelled',
          past_due_since: null,
          paddle_subscription_id: 'sub_b',
          paddle_last_event_at: '2026-10-20T10:00:00.100Z',
          superseded_subscription_id: 'sub_a',
          superseded_last_event_at: '2026-10-15T00:00:00.000Z',
        }),
      );
      liveById = {
        sub_b: {status: 'active', updated_at: '2026-10-20T10:00:00.000Z'},
        sub_a: {status: 'active', updated_at: '2026-10-15T00:00:00.000Z'},
      };
      await expect(
        upsertSubscription(reselectA, 'user-uuid-1', mockQuery, {
          snapshot: true,
          knownSelectionIds: new Set(['sub_a', 'sub_b']),
          knownSelectionState: new Map([
            [
              'sub_b',
              {status: 'active', updatedAt: '2026-10-20T10:00:00.000Z'},
            ],
            [
              'sub_a',
              {status: 'active', updatedAt: '2026-10-15T00:00:00.000Z'},
            ],
          ]),
        }),
      ).resolves.toBe('applied');

      // Ambiguous window + verification unavailable: throw, so
      // refresh surfaces a retryable error rather than accept a
      // possibly-changed selection.
      mockQuery.mockImplementation(
        mockWithRow({
          status: 'active',
          past_due_since: null,
          paddle_subscription_id: 'sub_b',
          paddle_last_event_at: '2026-10-20T10:00:01.000Z',
          superseded_subscription_id: null,
          superseded_last_event_at: null,
        }),
      );
      liveById = {};
      await expect(
        upsertSubscription(canceledA, 'user-uuid-1', mockQuery, {
          snapshot: true,
          knownSelectionIds: new Set(['sub_a', 'sub_b']),
          knownSelectionState: new Map([
            [
              'sub_b',
              {status: 'paused', updatedAt: '2026-10-20T10:00:00.000Z'},
            ],
            [
              'sub_a',
              {status: 'canceled', updatedAt: '2026-10-16T00:00:00.000Z'},
            ],
          ]),
        }),
      ).rejects.toThrow('Paddle live verification unavailable');
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
  });

  test('superseded clock advance is conditional on the slot still holding that subscription', async () => {
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
              paddle_subscription_id: 'sub_new',
              paddle_last_event_at: '2026-10-17T00:00:00.000Z',
              superseded_subscription_id: 'sub_old',
              superseded_last_event_at: '2026-10-16T00:00:00.000Z',
            },
          ]),
        );
      }
      if (sql.includes('set superseded_last_event_at')) {
        // A concurrent writer swapped the slot between the SELECT
        // and this update: zero rows match the condition.
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const canceledOld = makeEvent({
      occurred_at: '2026-10-18T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_old', status: 'canceled'},
    });
    // Without the condition, sub_old's timestamp would land in the
    // new superseded subscription's clock. With it, zero rows match —
    // and the upsert THROWS rather than reporting stale: refresh may
    // have promoted sub_old to current in the meantime, and
    // acknowledging the event would record it as processed while the
    // now-current subscription stays active. The webhook 500s and
    // Paddle redelivers against the newer state.
    await expect(
      upsertSubscription(canceledOld, 'user-uuid-1', mockQuery),
    ).rejects.toThrow('raced a subscription replacement');
    const update = mockQuery.mock.calls.find(args =>
      args[0].includes('set superseded_last_event_at'),
    );
    expect(update?.[0]).toContain('superseded_subscription_id = $3');
    expect(update?.[1]).toEqual([
      'user-uuid-1',
      '2026-10-18T00:00:00.000Z',
      'sub_old',
    ]);

    // A null rowCount (pg reports null for some commands) is also
    // treated as "the slot changed": throw, never a blind write.
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
              paddle_subscription_id: 'sub_new',
              paddle_last_event_at: '2026-10-17T00:00:00.000Z',
              superseded_subscription_id: 'sub_old',
              superseded_last_event_at: '2026-10-16T00:00:00.000Z',
            },
          ]),
        );
      }
      if (sql.includes('set superseded_last_event_at')) {
        return Promise.resolve({...makeQueryResult([]), rowCount: null});
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    await expect(
      upsertSubscription(canceledOld, 'user-uuid-1', mockQuery),
    ).rejects.toThrow('raced a subscription replacement');
  });

  test('overlapping superseded clock advances never move the clock backwards', async () => {
    // Two deliveries of sub_old non-active revisions overlap: both
    // read the superseded clock at Oct 16 (modeled by returning a
    // frozen SELECT snapshot) and both pass the JS ordering check.
    // The newer one (Oct 18) writes first; the older one (Oct 17)
    // writes second. The SQL greatest() keeps Oct 18 — a plain
    // assignment would stamp Oct 17 and let a delayed active
    // revision dated Oct 17+ promote the canceled subscription.
    const stored = {
      status: 'active',
      past_due_since: null as string | null,
      paddle_subscription_id: 'sub_new' as string | null,
      paddle_last_event_at: '2026-10-17T00:00:00.000Z' as string | null,
      superseded_subscription_id: 'sub_old' as string | null,
      superseded_last_event_at: '2026-10-16T00:00:00.000Z' as string | null,
    };
    const snapshot = {...stored};
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([snapshot]));
      }
      if (sql.includes('set superseded_last_event_at')) {
        expect(sql).toContain('greatest(');
        const candidate = params?.[1] as string;
        const current = stored.superseded_last_event_at;
        stored.superseded_last_event_at =
          current !== null && current > candidate ? current : candidate;
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const newer = makeEvent({
      occurred_at: '2026-10-18T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_old', status: 'canceled'},
    });
    const older = makeEvent({
      occurred_at: '2026-10-17T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_old', status: 'past_due'},
    });
    await expect(
      upsertSubscription(newer, 'user-uuid-1', mockQuery),
    ).resolves.toBe('applied');
    await expect(
      upsertSubscription(older, 'user-uuid-1', mockQuery),
    ).resolves.toBe('applied');
    expect(stored.superseded_last_event_at).toBe('2026-10-18T00:00:00.000Z');
  });

  test('throws when a cancellation commits between the SELECT and the INSERT', async () => {
    // Refresh reads sub_123 active with its clock at Oct 17 and
    // accepts a snapshot revision. Before the INSERT lands, a
    // cancellation for sub_123 commits: same subscription id, but
    // status cancelled and the clock advanced to Oct 19. A guard
    // comparing only the id would let the refresh restore active
    // and rewind the clock over the acknowledged cancellation. The
    // conflict predicate also compares both clocks and the
    // superseded identity, so the write matches zero rows (modeled
    // here by the insert returning none) and the upsert throws —
    // the refresh 500s and the retry re-reads the canceled state.
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
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
              paddle_last_event_at: '2026-10-17T00:00:00.000Z',
              superseded_subscription_id: 'sub_old',
              superseded_last_event_at: '2026-10-16T00:00:00.000Z',
            },
          ]),
        );
      }
      if (sql.includes('insert into subscriptions')) {
        // The predicate binds the SELECT-time state: current id,
        // current clock, superseded id, superseded clock.
        expect(sql).toContain('paddle_last_event_at is not distinct from');
        expect(sql).toContain('superseded_last_event_at is not distinct from');
        expect(params?.[13]).toBe('sub_123');
        expect(params?.[14]).toBe('2026-10-17T00:00:00.000Z');
        expect(params?.[15]).toBe('sub_old');
        expect(params?.[16]).toBe('2026-10-16T00:00:00.000Z');
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const snapshot = makeEvent({
      occurred_at: '2026-10-18T00:00:00.000Z',
      data: {...makeEvent().data, id: 'sub_123'},
    });
    await expect(
      upsertSubscription(snapshot, 'user-uuid-1', mockQuery, {snapshot: true}),
    ).rejects.toThrow('raced a subscription replacement');
  });

  test('webhook writes stamp the entity updated_at; snapshot reselect compares the same clock', async () => {
    let row: Record<string, unknown> | null = null;
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult(row ? [row] : []));
      }
      if (sql.includes('insert into subscriptions')) {
        const p = params as unknown[];
        row = {
          status: p[2],
          past_due_since: p[9],
          paddle_subscription_id: p[4],
          paddle_last_event_at: p[10],
          superseded_subscription_id: p[11],
          superseded_last_event_at: p[12],
        };
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    // sub_a's webhook occurred 100ms after its entity update; the
    // stored revision clock is updated_at (.000), not occurred_at.
    const webhookA = makeEvent({
      occurred_at: '2026-10-19T12:00:00.100Z',
      data: {
        ...makeEvent().data,
        id: 'sub_a',
        updated_at: '2026-10-19T12:00:00.000Z',
      },
    });
    await expect(
      upsertSubscription(webhookA, 'user-uuid-1', mockQuery),
    ).resolves.toBe('applied');
    expect(row?.['paddle_last_event_at']).toBe('2026-10-19T12:00:00.000Z');

    // sub_b replaces sub_a via refresh; sub_a becomes superseded
    // with the .000 clock. Snapshot replacements verify the
    // candidate's live state at write time — stub Paddle as still
    // reporting sub_b active at the claimed revision.
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-19T13:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    await expect(
      upsertSubscription(
        makeEvent({
          occurred_at: '2026-10-19T13:00:00.000Z',
          data: {...makeEvent().data, id: 'sub_b'},
        }),
        'user-uuid-1',
        mockQuery,
        {snapshot: true},
      ),
    ).resolves.toBe('applied');
    global.fetch = realFetch;
    delete process.env['PADDLE_API_KEY'];
    expect(row?.['superseded_subscription_id']).toBe('sub_a');
    expect(row?.['superseded_last_event_at']).toBe('2026-10-19T12:00:00.000Z');

    // Refresh reselects the unchanged sub_a: its revision (.000)
    // equals the superseded clock (.000), so it applies — had the
    // webhook stamped occurred_at (.100), this would read as older
    // and be rejected forever. Reselection verifies the candidate
    // live — stub Paddle as still reporting sub_a active at .000.
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'active', updated_at: '2026-10-19T12:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
    try {
      await expect(
        upsertSubscription(
          makeEvent({
            occurred_at: '2026-10-19T12:00:00.000Z',
            data: {...makeEvent().data, id: 'sub_a'},
          }),
          'user-uuid-1',
          mockQuery,
          {snapshot: true},
        ),
      ).resolves.toBe('applied');
    } finally {
      global.fetch = realFetch;
      delete process.env['PADDLE_API_KEY'];
    }
    expect(row?.['paddle_subscription_id']).toBe('sub_a');
  });

  test('snapshot past_due seeds the grace clock from the period start', async () => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (sql.includes('insert into subscriptions')) {
        return Promise.resolve(makeQueryResult([{}]));
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
        if (sql.includes('insert into subscriptions')) {
          return Promise.resolve(makeQueryResult([{}]));
        }
        return Promise.resolve(makeQueryResult([]));
      }) as typeof mockQuery;

    // Replacement (stored sub_old past_due since Oct 1; candidate
    // sub_new past_due with period start Oct 13): the candidate must
    // NOT inherit Oct 1 — that would end its grace immediately.
    // Snapshot replacements verify the candidate's live state at
    // write time — stub Paddle as still reporting sub_new past_due
    // at the claimed revision.
    const realFetch = global.fetch;
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {status: 'past_due', updated_at: '2026-10-17T00:00:00.000Z'},
        }),
      }) as Response) as typeof fetch;
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
    global.fetch = realFetch;
    delete process.env['PADDLE_API_KEY'];
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
      if (sql.includes('insert into subscriptions')) {
        return Promise.resolve(makeQueryResult([{}]));
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
