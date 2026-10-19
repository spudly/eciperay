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
        return Promise.resolve(makeQueryResult(storedSub ? [storedSub] : []));
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

  test('survives a non-Error failure while upserting a candidate', async () => {
    customersByEmail = {data: [{id: 'ctm_999'}]};
    subscriptionsForCustomer = {data: [paddleSub()]};
    planPricesError = 'db exploded';
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
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
    const res = await postRefresh();
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
    expect(res.body.status).toBe('active');
    const insert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(insert?.[1]?.[4]).toBe('sub_new');
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
