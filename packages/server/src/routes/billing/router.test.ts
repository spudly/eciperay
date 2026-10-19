import {createHmac} from 'node:crypto';

import {jest} from '@jest/globals';
import request from 'supertest';
import type {QueryResult} from 'pg';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {mockBillingPlan} from '../../test/mockBilling.js';

import {verifyPaddleSignature} from './paddleSignature.js';

/**
 * Wraps mockQuery.mockImplementation for SQL-routing mocks. The mock query type
 * is generic, but these callbacks return concrete row shapes, so the cast
 * bridges the two (same approach as createMockQuery's own cast).
 */
const mockRouteQueries = (impl: (text: string) => Promise<QueryResult>) => {
  mockQuery.mockImplementation(impl);
};

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const WEBHOOK_SECRET = 'test-webhook-secret';
process.env['PADDLE_WEBHOOK_SECRET'] = WEBHOOK_SECRET;

const sign = (ts: string, rawBody: string) =>
  createHmac('sha256', WEBHOOK_SECRET).update(`${ts}:${rawBody}`).digest('hex');

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  event_id: 'evt_test_123',
  event_type: 'subscription.created',
  occurred_at: new Date().toISOString(),
  notification_id: 'ntf_test_123',
  data: {
    id: 'sub_123',
    customer_id: 'ctm_123',
    status: 'active',
    custom_data: {user_id: 'user-uuid-1'},
    items: [{price: {id: 'pri_plus_monthly'}}],
    current_billing_period: {
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    },
    scheduled_change: null,
    customer: {email: 'user@test.com'},
  },
  ...overrides,
});

const postWebhook = (rawBody: string, signature: string) =>
  request(getApp())
    .post('/api/billing/paddle-webhook')
    .set('Content-Type', 'application/json')
    .set('Paddle-Signature', signature)
    .send(rawBody);

/** Routes mock queries by SQL for the subscription.created happy path. */
const mockWebhookQueries = (seenEventIds: string[] = []) => {
  mockRouteQueries((text: string) => {
    if (text.includes('from paddle_events')) {
      return Promise.resolve(
        makeQueryResult(seenEventIds.map(id => ({event_id: id}))),
      );
    }
    if (text.includes('from plan_prices')) {
      return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
    }
    if (text.includes('from subscriptions')) {
      return Promise.resolve(makeQueryResult([]));
    }
    if (text.includes('insert into subscriptions')) {
      return Promise.resolve(makeQueryResult([{}]));
    }
    if (text.includes('insert into paddle_events')) {
      return Promise.resolve(makeQueryResult([{}]));
    }
    return Promise.resolve(makeQueryResult([]));
  });
};

describe('POST /billing/paddle-webhook', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('accepts a validly signed subscription.created event', async () => {
    mockWebhookQueries();
    const rawBody = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000).toString();

    const res = await postWebhook(rawBody, `ts=${ts};h1=${sign(ts, rawBody)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({received: true});
    const upsertCall = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(upsertCall).toBeDefined();
    // plan resolved from plan_prices ('plus'), status mapped to active
    expect(upsertCall?.[1]).toEqual(
      expect.arrayContaining(['user-uuid-1', 'plus', 'active']),
    );
  });

  test('accepts a subscription.created event without a billing period', async () => {
    mockWebhookQueries();
    const event = makeEvent();
    const {current_billing_period, ...data} = event.data;
    // A scheduled cancellation exercises the scheduled_change?.action branch.
    const rawBody = JSON.stringify({
      ...event,
      data: {...data, scheduled_change: {action: 'cancel'}},
    });
    const ts = Math.floor(Date.now() / 1000).toString();

    const res = await postWebhook(rawBody, `ts=${ts};h1=${sign(ts, rawBody)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({received: true});
    const upsertCall = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(upsertCall).toBeDefined();
    // Missing period dates are stored as null; cancel_at_period_end is true.
    expect(upsertCall?.[1]).toEqual(expect.arrayContaining([null, null, true]));
  });

  test('rejects an invalid signature with 401', async () => {
    mockWebhookQueries();
    const rawBody = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000).toString();

    const res = await postWebhook(rawBody, `ts=${ts};h1=${'0'.repeat(64)}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({error: 'invalid signature'});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('rejects a stale timestamp with 401', async () => {
    mockWebhookQueries();
    const rawBody = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000 - 3600).toString();

    const res = await postWebhook(rawBody, `ts=${ts};h1=${sign(ts, rawBody)}`);

    expect(res.status).toBe(401);
  });

  test('treats a redelivered event as a duplicate', async () => {
    mockWebhookQueries(['evt_test_123']);
    const rawBody = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000).toString();

    const res = await postWebhook(rawBody, `ts=${ts};h1=${sign(ts, rawBody)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({received: true, duplicate: true});
    const upsertCall = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    expect(upsertCall).toBeUndefined();
  });

  test('acknowledges unknown event types without failing', async () => {
    mockWebhookQueries();
    const rawBody = JSON.stringify(
      makeEvent({event_id: 'evt_test_999', event_type: 'subscription.paused'}),
    );
    const ts = Math.floor(Date.now() / 1000).toString();

    const res = await postWebhook(rawBody, `ts=${ts};h1=${sign(ts, rawBody)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({received: true});
  });

  test('returns 500 when the handler fails so Paddle retries', async () => {
    mockRouteQueries((text: string) => {
      if (text.includes('from paddle_events')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      throw new Error('db down');
    });
    const rawBody = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000).toString();

    const res = await postWebhook(rawBody, `ts=${ts};h1=${sign(ts, rawBody)}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({error: 'handler failed'});
  });
});

describe('POST /billing/portal-link', () => {
  // Paddle API behavior for the current test. Non-Paddle URLs fall through
  // to the real fetch so nock-based Supabase auth keeps working.
  let paddleBehavior: () => Promise<Response>;
  let fetchCalls: {url: string; init: RequestInit}[];
  const realFetch = global.fetch;
  const postPortal = () =>
    request(getApp())
      .post('/api/billing/portal-link')
      .set('Authorization', 'Bearer test-token');

  beforeEach(() => {
    mockQuery.mockReset();
    nockSupabaseGetUser('user-uuid-1');
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    fetchCalls = [];
    paddleBehavior = async () => {
      throw new Error('paddle fetch not configured for this test');
    };
    global.fetch = async (url: unknown, init?: unknown) => {
      const urlStr = String(url);
      if (urlStr.includes('paddle.com')) {
        fetchCalls.push({url: urlStr, init: init ?? {}});
        return paddleBehavior();
      }
      return realFetch(url as never, init as never);
    };
  });

  afterEach(() => {
    delete process.env['PADDLE_API_KEY'];
    global.fetch = realFetch;
  });

  test('returns 500 when PADDLE_API_KEY is not set', async () => {
    delete process.env['PADDLE_API_KEY'];
    mockBillingPlan(mockQuery, 'plus');

    const res = await postPortal();

    expect(res.status).toBe(500);
    expect(res.body).toEqual({error: 'billing not configured'});
    expect(fetchCalls).toHaveLength(0);
  });

  test('returns 404 for a user without a Paddle customer', async () => {
    mockBillingPlan(mockQuery, null);

    const res = await postPortal();

    expect(res.status).toBe(404);
    expect(res.body).toEqual({error: 'no subscription'});
    expect(fetchCalls).toHaveLength(0);
  });

  test('returns 502 when the Paddle request throws', async () => {
    mockBillingPlan(mockQuery, 'plus');
    paddleBehavior = async () => {
      throw new Error('network down');
    };

    const res = await postPortal();

    expect(res.status).toBe(502);
    expect(res.body).toEqual({error: 'failed to create portal session'});
  });

  test('returns 502 when Paddle responds non-ok', async () => {
    mockBillingPlan(mockQuery, 'plus');
    paddleBehavior = async () => ({ok: false, status: 500}) as Response;

    const res = await postPortal();

    expect(res.status).toBe(502);
    expect(res.body).toEqual({error: 'failed to create portal session'});
  });

  test('returns 502 when the Paddle request throws a non-Error', async () => {
    mockBillingPlan(mockQuery, 'plus');
    paddleBehavior = async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- intentional non-Error throw covers portalLink catch branch
      throw 'string failure';
    };

    const res = await postPortal();

    expect(res.status).toBe(502);
    expect(res.body).toEqual({error: 'failed to create portal session'});
  });

  test('returns 502 on unexpected response shape', async () => {
    mockBillingPlan(mockQuery, 'plus');
    paddleBehavior = async () =>
      ({ok: true, json: async () => ({data: {}})}) as Response;

    const res = await postPortal();

    expect(res.status).toBe(502);
    expect(res.body).toEqual({error: 'unexpected portal response'});
  });

  test('returns the portal URL on success', async () => {
    mockBillingPlan(mockQuery, 'plus');
    paddleBehavior = async () =>
      ({
        ok: true,
        json: async () => ({
          data: {urls: {general: {overview: 'https://paddle.test/portal/abc'}}},
        }),
      }) as Response;

    const res = await postPortal();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({url: 'https://paddle.test/portal/abc'});
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]?.url).toContain('/customers/ctm_test/portal-sessions');
    expect(fetchCalls[0]?.init.method).toBe('POST');
    expect(fetchCalls[0]?.init.headers).toMatchObject({
      Authorization: 'Bearer test-paddle-key',
    });
  });
});

describe('verifyPaddleSignature', () => {
  const reqWith = (rawBody?: Buffer, header?: string) =>
    ({
      rawBody,
      header: (name: string) =>
        name === 'Paddle-Signature' ? header : undefined,
    }) as unknown as Parameters<typeof verifyPaddleSignature>[0];

  const rawBody = Buffer.from('{"event_id":"evt_1"}');
  const ts = Math.floor(Date.now() / 1000).toString();
  const goodSig = createHmac('sha256', WEBHOOK_SECRET)
    .update(`${ts}:`)
    .update(rawBody)
    .digest('hex');

  test('fails without a raw body', () => {
    const res = verifyPaddleSignature(
      reqWith(undefined, `ts=${ts};h1=${goodSig}`),
      WEBHOOK_SECRET,
    );
    expect(res).toEqual({ok: false, reason: 'missing raw body'});
  });

  test('fails without a signature header', () => {
    const res = verifyPaddleSignature(reqWith(rawBody), WEBHOOK_SECRET);
    expect(res).toEqual({ok: false, reason: 'missing signature header'});
  });

  test('skips header parts without =', () => {
    const res = verifyPaddleSignature(
      reqWith(rawBody, `nopair;ts=${ts};h1=${goodSig}`),
      WEBHOOK_SECRET,
    );
    expect(res.ok).toBe(true);
  });

  test('fails when ts is missing', () => {
    const res = verifyPaddleSignature(
      reqWith(rawBody, `h1=${goodSig}`),
      WEBHOOK_SECRET,
    );
    expect(res).toEqual({ok: false, reason: 'malformed signature header'});
  });

  test('fails when h1 is missing', () => {
    const res = verifyPaddleSignature(
      reqWith(rawBody, `ts=${ts}`),
      WEBHOOK_SECRET,
    );
    expect(res).toEqual({ok: false, reason: 'malformed signature header'});
  });

  test('accepts any matching signature during rotation', () => {
    const res = verifyPaddleSignature(
      reqWith(rawBody, `ts=${ts};h1=${'0'.repeat(64)};h1=${goodSig}`),
      WEBHOOK_SECRET,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) {
      throw new Error('expected signature verification to succeed');
    }
    expect(res.rawBody).toBe(rawBody);
  });
});

describe('POST /billing/paddle-webhook edge cases', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns 401 without a signature header', async () => {
    mockWebhookQueries();
    const res = await request(getApp())
      .post('/api/billing/paddle-webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(makeEvent()));
    expect(res.status).toBe(401);
  });

  test('retains rawBody for webhook URLs with query params', async () => {
    // The verify callback keys off the URL prefix so signatures still
    // validate when Paddle appends query params.
    mockWebhookQueries();
    const body = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000).toString();
    const res = await request(getApp())
      .post('/api/billing/paddle-webhook?foo=bar')
      .set('Content-Type', 'application/json')
      .set('Paddle-Signature', `ts=${ts};h1=${sign(ts, body)}`)
      .send(body);
    // 401 would mean rawBody was missing and verification failed outright;
    // any other status proves the raw body was retained for verification.
    expect(res.status).not.toBe(401);
  });

  test('returns 401 for a malformed signature (no h1)', async () => {
    mockWebhookQueries();
    const ts = Math.floor(Date.now() / 1000).toString();
    const res = await postWebhook(JSON.stringify(makeEvent()), `ts=${ts}`);
    expect(res.status).toBe(401);
  });

  test('returns 500 when PADDLE_WEBHOOK_SECRET is not set', async () => {
    const saved = process.env['PADDLE_WEBHOOK_SECRET'];
    delete process.env['PADDLE_WEBHOOK_SECRET'];
    try {
      mockWebhookQueries();
      const rawBody = JSON.stringify(makeEvent());
      const ts = Math.floor(Date.now() / 1000).toString();
      const res = await postWebhook(
        rawBody,
        `ts=${ts};h1=${sign(ts, rawBody)}`,
      );
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'webhook not configured'});
    } finally {
      process.env['PADDLE_WEBHOOK_SECRET'] = saved;
    }
  });

  test('returns 400 for invalid JSON', async () => {
    // Unit test: express.json() rejects malformed bodies before the route,
    // so invalid JSON can't reach the handler via HTTP.
    const {paddleWebhook} = await import('./paddleWebhook.js');
    const rawBody = Buffer.from('not json{{{');
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = createHmac('sha256', WEBHOOK_SECRET)
      .update(`${ts}:`)
      .update(rawBody)
      .digest('hex');
    const req = {
      rawBody,
      header: (name: string) =>
        name === 'Paddle-Signature' ? `ts=${ts};h1=${sig}` : undefined,
    } as unknown as Parameters<typeof paddleWebhook>[0];
    const json = jest.fn();
    const status = jest.fn(() => ({json}));
    const res = {status, json} as unknown as Parameters<
      typeof paddleWebhook
    >[1];
    mockWebhookQueries();
    await paddleWebhook(req, res, mockQuery);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({error: 'invalid JSON'});
  });

  test('returns 400 for a missing event envelope', async () => {
    mockWebhookQueries();
    const rawBody = JSON.stringify({foo: 'bar'});
    const ts = Math.floor(Date.now() / 1000).toString();
    const res = await postWebhook(rawBody, `ts=${ts};h1=${sign(ts, rawBody)}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({error: 'invalid event envelope'});
  });
});

describe('POST /billing/paddle-webhook event handling', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  const postEvent = (event: Record<string, unknown>) => {
    const rawBody = JSON.stringify(event);
    const ts = Math.floor(Date.now() / 1000).toString();
    return postWebhook(rawBody, `ts=${ts};h1=${sign(ts, rawBody)}`);
  };

  /** Webhook mocks with configurable user/subscription lookups. */
  const mockEventQueries = (
    opts: {
      byCustomer?: {user_id: string} | null;
      byEmail?: {id: string} | null;
      existingSub?: {status: string; past_due_since: string | null} | null;
    } = {},
  ) => {
    mockRouteQueries((text: string) => {
      if (text.includes('from paddle_events')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (text.includes('paddle_customer_id = $1')) {
        return Promise.resolve(
          makeQueryResult(opts.byCustomer ? [opts.byCustomer] : []),
        );
      }
      if (text.includes('from users where email')) {
        return Promise.resolve(
          makeQueryResult(opts.byEmail ? [opts.byEmail] : []),
        );
      }
      if (text.includes('paddle_subscription_id = $1')) {
        return Promise.resolve(makeQueryResult([{paddle_last_event_at: null}]));
      }
      if (text.includes('from subscriptions where user_id')) {
        return Promise.resolve(
          makeQueryResult(opts.existingSub ? [opts.existingSub] : []),
        );
      }
      if (
        text.includes('insert into subscriptions') ||
        text.includes('insert into paddle_events') ||
        text.includes('update subscriptions')
      ) {
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
  };

  const upserted = () =>
    mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );

  test("maps 'trialing' to active", async () => {
    mockEventQueries();
    const res = await postEvent(
      makeEvent({data: {...(makeEvent().data as object), status: 'trialing'}}),
    );
    expect(res.status).toBe(200);
    expect(upserted()?.[1]).toEqual(
      expect.arrayContaining(['user-uuid-1', 'plus', 'active']),
    );
  });

  test("maps 'past_due' and stamps past_due_since", async () => {
    mockEventQueries();
    const res = await postEvent(
      makeEvent({data: {...(makeEvent().data as object), status: 'past_due'}}),
    );
    expect(res.status).toBe(200);
    const call = upserted();
    if (!call) {
      throw new Error('expected subscription upsert');
    }
    const params = call[1]!;
    expect(params[2]).toBe('past_due');
    expect(typeof params[9]).toBe('string');
  });

  test("maps 'canceled' to cancelled", async () => {
    mockEventQueries();
    const res = await postEvent(
      makeEvent({data: {...(makeEvent().data as object), status: 'canceled'}}),
    );
    expect(res.status).toBe(200);
    expect(upserted()?.[1]).toEqual(
      expect.arrayContaining(['user-uuid-1', 'plus', 'cancelled']),
    );
  });

  test('preserves past_due_since when already past due', async () => {
    mockEventQueries({
      existingSub: {status: 'past_due', past_due_since: '2024-01-01T00:00:00Z'},
    });
    const res = await postEvent(
      makeEvent({data: {...(makeEvent().data as object), status: 'past_due'}}),
    );
    expect(res.status).toBe(200);
    const call = upserted();
    if (!call) {
      throw new Error('expected subscription upsert');
    }
    const params = call[1]!;
    expect(params[9]).toBe('2024-01-01T00:00:00Z');
  });

  test('skips upsert for unmapped statuses', async () => {
    mockEventQueries();
    const res = await postEvent(
      makeEvent({data: {...(makeEvent().data as object), status: 'paused'}}),
    );
    expect(res.status).toBe(200);
    expect(upserted()).toBeUndefined();
  });

  test('skips upsert when the price id is missing', async () => {
    mockEventQueries();
    const data = {...(makeEvent().data as object), items: []};
    const res = await postEvent(makeEvent({data}));
    expect(res.status).toBe(200);
    expect(upserted()).toBeUndefined();
  });

  test('returns 500 for an unknown price id so Paddle retries', async () => {
    mockRouteQueries((text: string) => {
      if (text.includes('from paddle_events')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const res = await postEvent(makeEvent());
    expect(res.status).toBe(500);
    expect(upserted()).toBeUndefined();
  });

  test('resolves the user by paddle customer id', async () => {
    mockEventQueries({byCustomer: {user_id: 'user-uuid-9'}});
    const data = {...(makeEvent().data as object), custom_data: {}};
    const res = await postEvent(makeEvent({data}));
    expect(res.status).toBe(200);
    expect(upserted()?.[1]).toEqual(
      expect.arrayContaining(['user-uuid-9', 'plus', 'active']),
    );
  });

  test('resolves the user by email fallback', async () => {
    mockEventQueries({byEmail: {id: 'user-uuid-7'}});
    const data = {
      ...(makeEvent().data as object),
      custom_data: {},
      customer_id: undefined,
    };
    const res = await postEvent(makeEvent({data}));
    expect(res.status).toBe(200);
    expect(upserted()?.[1]).toEqual(
      expect.arrayContaining(['user-uuid-7', 'plus', 'active']),
    );
  });

  test('returns 500 without recording the event when no user can be resolved', async () => {
    mockEventQueries();
    const data = {
      ...(makeEvent().data as object),
      custom_data: {},
      customer_id: undefined,
      customer: {},
    };
    const res = await postEvent(makeEvent({data}));
    // 500 so Paddle retries: recording the event as processed (the old
    // behavior) lost the purchase permanently once it was marked seen.
    expect(res.status).toBe(500);
    expect(res.body).toEqual({error: 'handler failed'});
    expect(upserted()).toBeUndefined();
    const recorded = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into paddle_events'),
    );
    expect(recorded).toBeUndefined();
  });

  test('resolves the user via the Paddle customer email lookup', async () => {
    mockEventQueries({byEmail: {id: 'user-uuid-8'}});
    const realFetch = global.fetch;
    const originalKey = process.env['PADDLE_API_KEY'];
    process.env['PADDLE_API_KEY'] = 'test-paddle-key';
    global.fetch = async (url: unknown) => {
      if (String(url).includes('/customers/ctm_123')) {
        return {
          ok: true,
          json: async () => ({data: {email: 'buyer@example.com'}}),
        } as Response;
      }
      return realFetch(url as never);
    };
    try {
      const data = {
        ...(makeEvent().data as object),
        custom_data: {},
        customer: {},
      };
      const res = await postEvent(makeEvent({data}));
      expect(res.status).toBe(200);
      expect(upserted()?.[1]).toEqual(
        expect.arrayContaining(['user-uuid-8', 'plus', 'active']),
      );
    } finally {
      global.fetch = realFetch;
      if (originalKey === undefined) {
        delete process.env['PADDLE_API_KEY'];
      } else {
        process.env['PADDLE_API_KEY'] = originalKey;
      }
    }
  });

  test('marks subscription cancelled on subscription.canceled', async () => {
    mockEventQueries();
    const res = await postEvent(
      makeEvent({
        event_id: 'evt_cancel_1',
        event_type: 'subscription.canceled',
      }),
    );
    expect(res.status).toBe(200);
    const update = mockQuery.mock.calls.find(args =>
      args[0].includes('set status = $2'),
    );
    expect(update).toBeDefined();
    expect(update?.[1]).toEqual(['sub_123', 'cancelled', expect.anything()]);
  });

  test('keeps subscription.canceled retryable while no subscription row exists', async () => {
    // Creation failed to map (and will be retried by Paddle); the
    // cancellation must not be recorded as processed in the meantime,
    // or the creation retry would resurrect the canceled subscription.
    mockRouteQueries((text: string) => {
      if (text.includes('from paddle_events')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const res = await postEvent(
      makeEvent({
        event_id: 'evt_cancel_before_create',
        event_type: 'subscription.canceled',
      }),
    );
    expect(res.status).toBe(500);
    expect(res.body).toEqual({error: 'handler failed'});
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into paddle_events'),
      ),
    ).toBe(false);
  });

  test('creation-failure, cancellation, creation-retry keeps the cancellation', async () => {
    let rowExists = false;
    const statusUpdates: string[] = [];
    mockRouteQueries((text: string) => {
      if (text.includes('from paddle_events')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (text.includes('set status = $2')) {
        statusUpdates.push('status');
        return Promise.resolve(makeQueryResult([{}]));
      }
      if (text.includes('paddle_subscription_id = $1')) {
        return Promise.resolve(
          makeQueryResult(rowExists ? [{paddle_last_event_at: null}] : []),
        );
      }
      if (text.includes('insert into subscriptions')) {
        rowExists = true;
        return Promise.resolve(makeQueryResult([{}]));
      }
      if (
        text.includes('insert into paddle_events') ||
        text.includes('update subscriptions')
      ) {
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    });

    // 1. Creation cannot be mapped yet -> 500, Paddle will retry.
    const unmappable = makeEvent({
      event_id: 'evt_seq_create',
      data: {
        id: 'sub_123',
        customer_id: 'ctm_unknown',
        status: 'active',
        items: [{price: {id: 'pri_plus_monthly'}}],
      },
    });
    const first = await postEvent(unmappable);
    expect(first.status).toBe(500);

    // 2. Cancellation arrives before the creation retry -> also 500,
    //    not recorded, so it stays retryable.
    const cancel = makeEvent({
      event_id: 'evt_seq_cancel',
      event_type: 'subscription.canceled',
      occurred_at: '2026-10-13T17:00:00Z',
    });
    const second = await postEvent(cancel);
    expect(second.status).toBe(500);
    expect(statusUpdates).toHaveLength(0);

    // 3. Creation retry, now mappable via custom_data -> row created.
    const mappable = makeEvent({
      event_id: 'evt_seq_create',
      data: {...makeEvent().data, custom_data: {user_id: 'user-uuid-1'}},
    });
    const third = await postEvent(mappable);
    expect(third.status).toBe(200);
    expect(rowExists).toBe(true);

    // 4. Cancellation retry now finds the row and applies.
    const fourth = await postEvent(cancel);
    expect(fourth.status).toBe(200);
    expect(statusUpdates).toHaveLength(1);
  });

  test('ignores a stale subscription.canceled event', async () => {
    mockRouteQueries((text: string) => {
      if (text.includes('from paddle_events')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('paddle_last_event_at from subscriptions')) {
        return Promise.resolve(
          makeQueryResult([{paddle_last_event_at: '2026-10-13T16:00:00Z'}]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const res = await postEvent(
      makeEvent({
        event_id: 'evt_cancel_stale',
        event_type: 'subscription.canceled',
        occurred_at: '2026-10-13T15:00:00Z',
      }),
    );
    expect(res.status).toBe(200);
    expect(
      mockQuery.mock.calls.some(args => args[0].includes('set status = $2')),
    ).toBe(false);
  });

  test('ignores subscription.canceled without a subscription id', async () => {
    mockEventQueries();
    const data = {...(makeEvent().data as object), id: undefined};
    const res = await postEvent(
      makeEvent({
        event_id: 'evt_cancel_2',
        event_type: 'subscription.canceled',
        data,
      }),
    );
    expect(res.status).toBe(200);
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes("set status = 'cancelled'"),
      ),
    ).toBe(false);
  });

  test('marks subscription past_due on subscription.past_due', async () => {
    mockEventQueries();
    const res = await postEvent(
      makeEvent({event_id: 'evt_pd_1', event_type: 'subscription.past_due'}),
    );
    expect(res.status).toBe(200);
    const update = mockQuery.mock.calls.find(args =>
      args[0].includes('set status = $2'),
    );
    expect(update).toBeDefined();
    expect(update?.[1]?.[1]).toBe('past_due');
  });

  test('acknowledges transaction events', async () => {
    mockEventQueries();
    for (const eventType of ['transaction.completed', 'transaction.refunded']) {
      const res = await postEvent(
        makeEvent({event_id: `evt_txn_${eventType}`, event_type: eventType}),
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({received: true});
    }
  });
});

describe('POST /billing/paddle-webhook branch coverage', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  const postEvent = (event: Record<string, unknown>) => {
    const rawBody = JSON.stringify(event);
    const ts = Math.floor(Date.now() / 1000).toString();
    return postWebhook(rawBody, `ts=${ts};h1=${sign(ts, rawBody)}`);
  };

  const mockEventQueries = () => {
    mockRouteQueries((text: string) => {
      if (text.includes('from paddle_events')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (text.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (
        text.includes('insert into subscriptions') ||
        text.includes('insert into paddle_events')
      ) {
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
  };

  test('logs unknown when status is missing', async () => {
    mockEventQueries();
    const data = {...(makeEvent().data as object), status: undefined};
    const res = await postEvent(makeEvent({data}));
    expect(res.status).toBe(200);
    // No upsert for unmapped (missing) status
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('insert into subscriptions'),
      ),
    ).toBe(false);
  });

  test('handles past_due with null past_due_since', async () => {
    mockRouteQueries((text: string) => {
      if (text.includes('from paddle_events')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('from plan_prices')) {
        return Promise.resolve(makeQueryResult([{plan: 'plus'}]));
      }
      if (text.includes('from subscriptions where user_id')) {
        return Promise.resolve(
          makeQueryResult([{status: 'past_due', past_due_since: null}]),
        );
      }
      if (
        text.includes('insert into subscriptions') ||
        text.includes('insert into paddle_events')
      ) {
        return Promise.resolve(makeQueryResult([{}]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const data = {...(makeEvent().data as object), status: 'past_due'};
    const res = await postEvent(makeEvent({data}));
    expect(res.status).toBe(200);
    const upsert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    if (!upsert) {
      throw new Error('expected subscription upsert');
    }
    // wasPastDue with null past_due_since -> ?? null branch -> null
    expect(upsert[1]![9]).toBeNull();
  });

  test('upserts with nulls when optional event fields are missing', async () => {
    mockEventQueries();
    const data = {
      status: 'active',
      custom_data: {user_id: 'user-uuid-1'},
      items: [{price: {id: 'pri_plus_monthly'}}],
    };
    const res = await postEvent(makeEvent({data}));
    expect(res.status).toBe(200);
    const upsert = mockQuery.mock.calls.find(args =>
      args[0].includes('insert into subscriptions'),
    );
    if (!upsert) {
      throw new Error('expected subscription upsert');
    }
    const params = upsert[1]!;
    // customer_id, id, billing period start/end all null
    expect(params[3]).toBeNull();
    expect(params[4]).toBeNull();
    expect(params[6]).toBeNull();
    expect(params[7]).toBeNull();
  });

  test('returns 500 with string error when handler throws non-Error', async () => {
    mockRouteQueries((text: string) => {
      if (text.includes('from paddle_events')) {
        return Promise.resolve(makeQueryResult([]));
      }
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- intentional non-Error throw covers paddleWebhook catch branch
      throw 'string failure';
    });
    const rawBody = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000).toString();
    const res = await postWebhook(rawBody, `ts=${ts};h1=${sign(ts, rawBody)}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({error: 'handler failed'});
  });
});
