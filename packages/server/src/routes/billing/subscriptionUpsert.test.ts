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
