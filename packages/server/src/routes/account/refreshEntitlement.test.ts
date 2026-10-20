import request from 'supertest';
import type {QueryResult} from 'pg';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const mockRouteQueries = (impl: (text: string) => Promise<QueryResult>) => {
  mockQuery.mockImplementation(impl);
};

type StoredSub = {
  plan: string;
  status: string;
  paddle_customer_id: string | null;
  paddle_subscription_id?: string | null;
  paddle_last_event_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  past_due_since: string | null;
};

const futureDate = () =>
  new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

const paddleSub = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub_1',
  customer_id: 'ctm_999',
  status: 'active',
  items: [{price: {id: 'pri_plus_monthly'}}],
  current_billing_period: {
    starts_at: new Date().toISOString(),
    ends_at: futureDate(),
  },
  scheduled_change: null,
  ...overrides,
});

describe('POST /api/account/entitlement/refresh', () => {
  const realFetch = global.fetch;
  let storedSub: StoredSub | null;
  let concurrentRow: StoredSub | null;
  let planForPrice: string | null;
  let customersByEmail: unknown;
  let subscriptionsForCustomer: unknown;
  let paddleStatus: number;
  let fetchUrls: string[];
  let planPricesError: unknown;

  const postRefresh = () =>
    request(getApp())
      .post('/api/account/entitlement/refresh')
      .set('Authorization', 'Bearer <redacted>');

  beforeEach(() => {
    mockQuery.mockReset();
    nockSupabaseGetUser('user-uuid-1');
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    storedSub = null;
    concurrentRow = null;
    planForPrice = 'plus';
    customersByEmail = {data: []};
    subscriptionsForCustomer = {data: []};
    paddleStatus = 200;
    fetchUrls = [];
    planPricesError = undefined;

    mockRouteQueries((text: string) => {
      if (text.includes('from entitlement_overrides')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('select paddle_customer_id')) {
        return Promise.resolve(
          makeQueryResult(
            storedSub
              ? [
                  {
                    paddle_customer_id: storedSub.paddle_customer_id,
                    paddle_subscription_id:
                      storedSub.paddle_subscription_id ?? null,
                  },
                ]
              : [],
          ),
        );
      }
      if (text.includes('from plan_prices')) {
        if (planPricesError !== undefined) {
          throw planPricesError;
        }
        return Promise.resolve(
          makeQueryResult(planForPrice ? [{plan: planForPrice}] : []),
        );
      }
      if (text.includes('insert into subscriptions')) {
        storedSub = {
          plan: planForPrice ?? 'plus',
          status: 'active',
          paddle_customer_id: 'ctm_999',
          paddle_last_event_at: new Date().toISOString(),
          current_period_end: futureDate(),
          cancel_at_period_end: false,
          past_due_since: null,
        };
        return Promise.resolve(makeQueryResult([{}]));
      }
      if (text.includes('from subscriptions')) {
        const row = concurrentRow ?? storedSub;
        return Promise.resolve(makeQueryResult(row ? [row] : []));
      }
      if (text.includes('from ai_usage')) {
        return Promise.resolve(makeQueryResult([{calls: 1}]));
      }
      return Promise.resolve(makeQueryResult([]));
    });

    global.fetch = async (url: unknown, init?: unknown) => {
      const urlStr = String(url);
      if (urlStr.includes('paddle.com')) {
        fetchUrls.push(urlStr);
        const payload = urlStr.includes('/subscriptions?')
          ? subscriptionsForCustomer
          : customersByEmail;
        return {
          ok: paddleStatus === 200,
          status: paddleStatus,
          json: async () => payload,
        } as Response;
      }
      return realFetch(url as never, init as never);
    };
  });

  afterEach(() => {
    delete process.env['PADDLE_API_KEY'];
    global.fetch = realFetch;
  });

  test('returns 401 without auth', async () => {
    const res = await request(getApp()).post(
      '/api/account/entitlement/refresh',
    );
    expect(res.status).toBe(401);
  });

  test('returns 500 when PADDLE_API_KEY is not set', async () => {
    delete process.env['PADDLE_API_KEY'];
    const res = await postRefresh();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({error: 'billing not configured'});
    expect(fetchUrls).toHaveLength(0);
  });

  test('returns the current entitlement when Paddle has no customer', async () => {
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
    expect(fetchUrls.some(url => url.includes('/customers?email='))).toBe(true);
    expect(fetchUrls.some(url => url.includes('/subscriptions?'))).toBe(false);
  });

  test('upserts a subscription found by account email and returns the new plan', async () => {
    customersByEmail = {data: [{id: 'ctm_999', email: 'user-uuid-1@test.com'}]};
    subscriptionsForCustomer = {data: [paddleSub()]};
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
    expect(res.body.status).toBe('active');
    expect(res.body.paddleCustomerId).toBe('ctm_999');
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(insert?.[1]).toEqual(
      expect.arrayContaining(['user-uuid-1', 'plus', 'active', 'ctm_999']),
    );
  });

  test('uses the known paddle customer id without an email lookup', async () => {
    storedSub = {
      plan: 'plus',
      status: 'cancelled',
      paddle_customer_id: 'ctm_999',
      paddle_subscription_id: 'sub_1',
      paddle_last_event_at: null,
      current_period_end: new Date(Date.now() - 1000).toISOString(),
      cancel_at_period_end: true,
      past_due_since: null,
    };
    subscriptionsForCustomer = {data: [paddleSub()]};
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
    expect(fetchUrls.some(url => url.includes('/customers?email='))).toBe(
      false,
    );
    expect(fetchUrls.some(url => url.includes('/subscriptions?'))).toBe(true);
  });

  test('prefers an active subscription over a cancelled one', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {
      data: [
        paddleSub({id: 'sub_old', status: 'canceled'}),
        paddleSub({id: 'sub_new'}),
      ],
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(insert?.[1]).toEqual(expect.arrayContaining(['sub_new']));
  });

  test('skips a subscription with an unknown price id instead of failing', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {data: [paddleSub()]};
    planForPrice = null;
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(insert).toBeUndefined();
  });

  test('breaks a status tie by the latest period end', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {
      data: [
        paddleSub({
          id: 'sub_soon',
          current_billing_period: {
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          },
        }),
        paddleSub({id: 'sub_late'}),
        paddleSub({id: 'sub_no_period', current_billing_period: undefined}),
      ],
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(insert?.[1]).toEqual(expect.arrayContaining(['sub_late']));
  });

  test('accepts items that carry a bare price_id and subscriptions without a period', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {
      data: [
        null,
        paddleSub({
          items: [{price_id: 'pri_plus_monthly'}],
          current_billing_period: undefined,
          scheduled_change: undefined,
          custom_data: {user_id: 'user-uuid-1'},
        }),
      ],
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
  });

  test('returns the current entitlement when the customer match has no usable id', async () => {
    customersByEmail = {data: [{id: 42}]};
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
  });

  test('returns 502 when the subscriptions payload is malformed', async () => {
    storedSub = {
      plan: 'plus',
      status: 'active',
      paddle_customer_id: 'ctm_999',
      paddle_last_event_at: null,
      current_period_end: futureDate(),
      cancel_at_period_end: false,
      past_due_since: null,
    };
    subscriptionsForCustomer = {data: {unexpected: true}};
    const res = await postRefresh();
    expect(res.status).toBe(502);
  });

  test('ignores a subscription with an unrecognized status', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {data: [paddleSub({status: 'weird'})]};
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
  });

  test('treats missing or unparseable period ends as oldest in a tie', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {
      data: [
        paddleSub({
          id: 'sub_no_end',
          current_billing_period: {starts_at: new Date().toISOString()},
        }),
        paddleSub({
          id: 'sub_bad_end',
          current_billing_period: {
            starts_at: new Date().toISOString(),
            ends_at: 'not-a-date',
          },
        }),
        paddleSub({id: 'sub_valid_end'}),
      ],
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(insert?.[1]).toEqual(expect.arrayContaining(['sub_valid_end']));
  });

  test('fails the refresh when upserting hits a persistence failure', async () => {
    // A database failure is not an unusable candidate: the refresh
    // must surface it instead of silently reporting the stale
    // entitlement (or worse, a lower-ranked candidate) as refreshed.
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {data: [paddleSub()]};
    planPricesError = 'db exploded';
    const res = await postRefresh();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({error: 'failed to refresh subscription status'});
  });

  test('a failed write for the active candidate never falls through to a canceled one', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {
      data: [paddleSub(), paddleSub({id: 'sub_old', status: 'canceled'})],
    };
    let insertAttempts = 0;
    mockRouteQueries((text: string) => {
      if (text.includes('from entitlement_overrides')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('select paddle_customer_id')) {
        return Promise.resolve(
          makeQueryResult([{paddle_customer_id: 'ctm_999'}]),
        );
      }
      if (text.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (text.includes('insert into subscriptions')) {
        insertAttempts += 1;
        throw new Error('db unavailable');
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const res = await postRefresh();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({error: 'failed to refresh subscription status'});
    // Only the preferred active candidate was attempted; the
    // historical canceled subscription was never written over it.
    expect(insertAttempts).toBe(1);
  });

  test('returns the current entitlement when the customer list is malformed', async () => {
    customersByEmail = {data: {unexpected: true}};
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
  });

  test('returns the current entitlement when the customer id is empty', async () => {
    customersByEmail = {data: [{id: ''}]};
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
  });

  test('ranks an unrecognized status below every known status', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {
      data: [paddleSub({id: 'sub_weird', status: 'weird'}), paddleSub()],
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(insert?.[1]).toEqual(expect.arrayContaining(['sub_1']));
  });

  test('skips a subscription that reports no items', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {data: [paddleSub({items: undefined})]};
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
  });

  test('skips a subscription whose first item is empty', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {data: [paddleSub({items: [null]})]};
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
  });

  test('stamps the upsert with Paddle updated_at, not local time', async () => {
    storedSub = {
      plan: 'plus',
      status: 'active',
      paddle_customer_id: 'ctm_999',
      paddle_subscription_id: 'sub_1',
      paddle_last_event_at: null,
      current_period_end: futureDate(),
      cancel_at_period_end: false,
      past_due_since: null,
    };
    subscriptionsForCustomer = {
      data: [paddleSub({updated_at: '2026-10-01T12:00:00.000Z'})],
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    // Event timestamp is the last bind parameter.
    expect(insert?.[1]?.[10]).toBe('2026-10-01T12:00:00.000Z');
  });

  test('falls back to now when the same subscription has no usable updated_at', async () => {
    storedSub = {
      plan: 'plus',
      status: 'active',
      paddle_customer_id: 'ctm_999',
      paddle_subscription_id: 'sub_1',
      paddle_last_event_at: null,
      current_period_end: futureDate(),
      cancel_at_period_end: false,
      past_due_since: null,
    };
    subscriptionsForCustomer = {
      data: [paddleSub({updated_at: 'not-a-timestamp'})],
    };
    const before = Date.now();
    const res = await postRefresh();
    expect(res.status).toBe(200);
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    const eventAt = insert?.[1]?.[10] as string;
    expect(Date.parse(eventAt)).toBeGreaterThanOrEqual(before - 1000);
  });

  test('a replacement subscription is not rejected as a stale revision', async () => {
    // The previous subscription was canceled on Oct 18; its replacement
    // became active on Oct 17. Revision ordering applies within one
    // subscription, so the replacement must apply despite its older
    // updated_at.
    storedSub = {
      plan: 'plus',
      status: 'cancelled',
      paddle_customer_id: 'ctm_999',
      paddle_subscription_id: 'sub_old',
      paddle_last_event_at: '2026-10-18T00:00:00.000Z',
      current_period_end: '2020-01-01T00:00:00.000Z',
      cancel_at_period_end: true,
      past_due_since: null,
    };
    subscriptionsForCustomer = {
      data: [
        paddleSub({id: 'sub_new', updated_at: '2026-10-17T00:00:00.000Z'}),
      ],
    };
    // The replacement is verified against Paddle's live state at
    // write time: serve the single-subscription GET accordingly.
    global.fetch = async (url: unknown, init?: unknown) => {
      const urlStr = String(url);
      if (urlStr.includes('/subscriptions/sub_new')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {status: 'active', updated_at: '2026-10-17T00:00:00.000Z'},
          }),
        } as Response;
      }
      if (urlStr.includes('paddle.com')) {
        fetchUrls.push(urlStr);
        const payload = urlStr.includes('/subscriptions?')
          ? subscriptionsForCustomer
          : customersByEmail;
        return {
          ok: paddleStatus === 200,
          status: paddleStatus,
          json: async () => payload,
        } as Response;
      }
      return realFetch(url as never, init as never);
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
    expect(res.body.status).toBe('active');
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(insert?.[1]?.[4]).toBe('sub_new');
  });

  test('a cancellation landing during a replacement refresh is not undone', async () => {
    // Refresh starts against sub_old, but before its upsert runs, a
    // webhook installs sub_new and then cancels it. The replacement
    // decision is made against the write-time row, so the (older)
    // active snapshot of sub_new is stale relative to its own
    // cancellation and must not resurrect it.
    storedSub = {
      plan: 'plus',
      status: 'cancelled',
      paddle_customer_id: 'ctm_999',
      paddle_subscription_id: 'sub_old',
      paddle_last_event_at: '2026-10-18T00:00:00.000Z',
      current_period_end: '2020-01-01T00:00:00.000Z',
      cancel_at_period_end: true,
      past_due_since: null,
    };
    concurrentRow = {
      plan: 'plus',
      status: 'cancelled',
      paddle_customer_id: 'ctm_999',
      paddle_subscription_id: 'sub_new',
      paddle_last_event_at: new Date().toISOString(),
      current_period_end: futureDate(),
      cancel_at_period_end: true,
      past_due_since: null,
    };
    subscriptionsForCustomer = {
      data: [
        paddleSub({
          id: 'sub_new',
          updated_at: new Date(Date.now() - 3600_000).toISOString(),
        }),
      ],
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);
  });

  test('a stale snapshot cannot overwrite newer stored state', async () => {
    storedSub = {
      plan: 'plus',
      status: 'cancelled',
      paddle_customer_id: 'ctm_999',
      paddle_subscription_id: 'sub_1',
      paddle_last_event_at: '2030-01-01T00:00:00.000Z',
      current_period_end: '2020-01-01T00:00:00.000Z',
      cancel_at_period_end: true,
      past_due_since: null,
    };
    subscriptionsForCustomer = {
      data: [paddleSub({updated_at: '2026-01-01T00:00:00.000Z'})],
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);
  });

  test('skips an unusable paused candidate for a usable canceled one', async () => {
    subscriptionsForCustomer = {
      data: [
        paddleSub({id: 'sub_paused', status: 'paused'}),
        paddleSub({id: 'sub_canceled', status: 'canceled'}),
      ],
    };
    customersByEmail = {data: [{id: 'ctm_999'}]};
    const res = await postRefresh();
    expect(res.status).toBe(200);
    const inserts = mockQuery.mock.calls.filter(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.[1]?.[2]).toBe('cancelled');
    expect(inserts[0]?.[1]?.[4]).toBe('sub_canceled');
  });

  test('returns 502 when the customer lookup fails (not "no customer")', async () => {
    paddleStatus = 503;
    const res = await postRefresh();
    expect(res.status).toBe(502);
    expect(res.body).toEqual({error: 'failed to refresh subscription status'});
  });

  test('a recovered past_due subscription does not restart its grace period', async () => {
    const periodStart = new Date(
      Date.now() - 8 * 24 * 3600 * 1000,
    ).toISOString();
    subscriptionsForCustomer = {
      data: [
        paddleSub({
          status: 'past_due',
          current_billing_period: {
            starts_at: periodStart,
            ends_at: futureDate(),
          },
        }),
      ],
    };
    customersByEmail = {data: [{id: 'ctm_999'}]};
    let inserted: unknown[] | null = null;
    mockRouteQueries((text: string, params?: unknown[]) => {
      if (text.includes('from entitlement_overrides')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('select paddle_customer_id')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (text.includes('insert into subscriptions')) {
        inserted = params ?? null;
        return Promise.resolve(makeQueryResult([{}]));
      }
      if (text.includes('from subscriptions')) {
        return Promise.resolve(
          makeQueryResult(
            inserted
              ? [
                  {
                    plan: 'plus',
                    status: 'past_due',
                    paddle_customer_id: 'ctm_999',
                    paddle_subscription_id: 'sub_1',
                    paddle_last_event_at: inserted[10],
                    current_period_end: futureDate(),
                    cancel_at_period_end: false,
                    past_due_since: inserted[9],
                  },
                ]
              : [],
          ),
        );
      }
      if (text.includes('from ai_usage')) {
        return Promise.resolve(makeQueryResult([{calls: 0}]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const res = await postRefresh();
    expect(res.status).toBe(200);
    // Delinquency began with the unpaid period 8 days ago, so the
    // 7-day grace has already expired: free, not a fresh grace window.
    expect(inserted?.[9]).toBe(periodStart);
    expect(res.body.plan).toBe('free');
  });

  test('re-fetches and re-ranks when the top candidate is canceled mid-refresh', async () => {
    // Paddle's first list ranks sub_a first (active, later period
    // end) over sub_b (also active). But sub_a's cancellation has
    // already committed to the database — newer than sub_a's
    // snapshot — so sub_a's upsert reports 'stale'. Stopping there
    // would leave canceled sub_a selected and strand the user on
    // Free even though sub_b is still active. The refresh re-fetches
    // once: Paddle now reports sub_a canceled, sub_b ranks first,
    // and sub_b is applied.
    let dbRow: Record<string, unknown> | null = {
      plan: 'plus',
      status: 'cancelled',
      paddle_customer_id: 'ctm_999',
      paddle_subscription_id: 'sub_a',
      paddle_last_event_at: '2026-10-19T00:00:00.000Z',
      current_period_end: '2026-11-18T00:00:00.000Z',
      cancel_at_period_end: true,
      past_due_since: null,
      superseded_subscription_id: null,
      superseded_last_event_at: null,
    };
    mockRouteQueries((text: string, params?: unknown[]) => {
      if (text.includes('from entitlement_overrides')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('select paddle_customer_id')) {
        return Promise.resolve(
          makeQueryResult([{paddle_customer_id: 'ctm_999'}]),
        );
      }
      if (text.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (text.includes('insert into subscriptions')) {
        const p = params as unknown[];
        dbRow = {
          ...dbRow,
          plan: p[1],
          status: p[2],
          paddle_customer_id: p[3],
          paddle_subscription_id: p[4],
          paddle_last_event_at: p[10],
          current_period_end: p[7],
          cancel_at_period_end: p[8],
          past_due_since: p[9],
          superseded_subscription_id: p[11],
          superseded_last_event_at: p[12],
        };
        return Promise.resolve(makeQueryResult([{}]));
      }
      if (text.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult(dbRow ? [dbRow] : []));
      }
      if (text.includes('from ai_usage')) {
        return Promise.resolve(makeQueryResult([{calls: 0}]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const subA = (status: string, updatedAt: string) =>
      paddleSub({
        id: 'sub_a',
        status,
        updated_at: updatedAt,
        current_billing_period: {
          starts_at: '2026-10-18T00:00:00.000Z',
          ends_at: '2026-11-18T00:00:00.000Z',
        },
      });
    const subB = () =>
      paddleSub({
        id: 'sub_b',
        updated_at: '2026-10-17T00:00:00.000Z',
        current_billing_period: {
          starts_at: '2026-10-17T00:00:00.000Z',
          ends_at: '2026-11-17T00:00:00.000Z',
        },
      });
    let listCalls = 0;
    let currentList: Array<Record<string, unknown>> = [];
    global.fetch = async (url: unknown) => {
      const urlStr = String(url);
      if (urlStr.includes('paddle.com')) {
        fetchUrls.push(urlStr);
        if (urlStr.includes('/subscriptions?')) {
          listCalls += 1;
          const payload =
            listCalls === 1
              ? {data: [subA('active', '2026-10-18T00:00:00.000Z'), subB()]}
              : {data: [subA('canceled', '2026-10-19T00:00:00.000Z'), subB()]};
          currentList = payload.data as Array<Record<string, unknown>>;
          return {ok: true, status: 200, json: async () => payload} as Response;
        }
        if (urlStr.includes('/subscriptions/')) {
          // Single-subscription GET (the upsert's write-time live
          // verification): answer from the most recently served list.
          const id = urlStr.split('/subscriptions/')[1];
          const entry = currentList.find(s => s['id'] === id);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: {
                status: entry?.['status'],
                updated_at: entry?.['updated_at'],
              },
            }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => customersByEmail,
        } as Response;
      }
      return realFetch(url as never);
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
    expect(res.body.status).toBe('active');
    expect(listCalls).toBe(2);
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(insert?.[1]?.[4]).toBe('sub_b');
  });

  test('an unpriced active candidate is not replaced by a canceled one', async () => {
    // The stored subscription is still active at Paddle but moved
    // to a price the plan_prices seed does not know; an older
    // canceled subscription has a known price. Skipping the active
    // candidate for its unknown price must not let the canceled
    // candidate replace it — that downgrades a still-paying user
    // toward Free. The stored entitlement stands instead.
    storedSub = {
      plan: 'plus',
      status: 'active',
      paddle_customer_id: 'ctm_999',
      paddle_subscription_id: 'sub_a',
      paddle_last_event_at: '2026-10-10T00:00:00.000Z',
      current_period_end: futureDate(),
      cancel_at_period_end: false,
      past_due_since: null,
    };
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {
      data: [
        paddleSub({
          id: 'sub_a',
          items: [{price: {id: 'pri_unseeded'}}],
          updated_at: '2026-10-17T00:00:00.000Z',
        }),
        paddleSub({
          id: 'sub_b',
          status: 'canceled',
          updated_at: '2026-10-09T00:00:00.000Z',
        }),
      ],
    };
    mockRouteQueries((text: string, params?: unknown[]) => {
      if (text.includes('from entitlement_overrides')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('select paddle_customer_id')) {
        return Promise.resolve(
          makeQueryResult(
            storedSub
              ? [
                  {
                    paddle_customer_id: storedSub.paddle_customer_id,
                    paddle_subscription_id:
                      storedSub.paddle_subscription_id ?? null,
                  },
                ]
              : [],
          ),
        );
      }
      if (text.includes('from plan_prices')) {
        return Promise.resolve(
          makeQueryResult(
            params?.[0] === 'pri_plus_monthly' ? [{plan: 'plus'}] : [],
          ),
        );
      }
      if (text.includes('insert into subscriptions')) {
        const p = params as unknown[];
        storedSub = {
          plan: p[1] as string,
          status: p[2] as string,
          paddle_customer_id: 'ctm_999',
          paddle_subscription_id: p[4] as string,
          paddle_last_event_at: p[10] as string,
          current_period_end: p[7] as string,
          cancel_at_period_end: p[8] as boolean,
          past_due_since: p[9] as string | null,
        };
        return Promise.resolve(makeQueryResult([{}]));
      }
      if (text.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult(storedSub ? [storedSub] : []));
      }
      if (text.includes('from ai_usage')) {
        return Promise.resolve(makeQueryResult([{calls: 1}]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    // Serve the write-time live verification for sub_b as well, so
    // the canceled candidate COULD install if it were tried.
    global.fetch = async (url: unknown, init?: unknown) => {
      const urlStr = String(url);
      if (urlStr.includes('/subscriptions/sub_b')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {status: 'canceled', updated_at: '2026-10-09T00:00:00.000Z'},
          }),
        } as Response;
      }
      if (urlStr.includes('paddle.com')) {
        fetchUrls.push(urlStr);
        const payload = urlStr.includes('/subscriptions?')
          ? subscriptionsForCustomer
          : customersByEmail;
        return {
          ok: paddleStatus === 200,
          status: paddleStatus,
          json: async () => payload,
        } as Response;
      }
      return realFetch(url as never, init as never);
    };
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
    expect(res.body.status).toBe('active');
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);
  });

  test('returns 502 when the Paddle subscriptions request fails', async () => {
    storedSub = {
      plan: 'plus',
      status: 'active',
      paddle_customer_id: 'ctm_999',
      paddle_last_event_at: null,
      current_period_end: futureDate(),
      cancel_at_period_end: false,
      past_due_since: null,
    };
    paddleStatus = 503;
    const res = await postRefresh();
    expect(res.status).toBe(502);
    expect(res.body).toEqual({error: 'failed to refresh subscription status'});
  });
});
