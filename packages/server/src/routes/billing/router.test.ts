import {createHmac} from 'node:crypto';
import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import type {QueryResult} from 'pg';
import {lazyTestApp} from '../../test/lazyTestApp.js';

/**
 * Wraps mockQuery.mockImplementation for SQL-routing mocks. The mock query type
 * is generic, but these callbacks return concrete row shapes, so the cast
 * bridges the two (same approach as createMockQuery's own cast).
 */
const mockRouteQueries = (impl: (text: string) => Promise<QueryResult>) => {
  mockQuery.mockImplementation(
    impl as unknown as (
      text: string,
      params?: unknown[],
    ) => Promise<QueryResult>,
  );
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
      (args[0] as string).includes('insert into subscriptions'),
    );
    expect(upsertCall).toBeDefined();
    // plan resolved from plan_prices ('plus'), status mapped to active
    expect(upsertCall?.[1]).toEqual(
      expect.arrayContaining(['user-uuid-1', 'plus', 'active']),
    );
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
      (args[0] as string).includes('insert into subscriptions'),
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
