import express from 'express';
import request from 'supertest';
import type {QueryResult} from 'pg';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';
import {nockSupabaseGetUser} from '../test/mockNockSupabase.js';

import {loadEntitlement, type EntitledRequest} from './loadEntitlement.js';
import {requireAuth} from './requireAuth.js';
import {requirePlan} from './requirePlan.js';

/**
 * Wraps mockQuery.mockImplementation for SQL-routing mocks. The mock query type
 * is generic, but these callbacks return concrete row shapes, so the cast
 * bridges the two (same approach as createMockQuery's own cast).
 */
const mockRouteQueries = (impl: (text: string) => Promise<QueryResult>) => {
  mockQuery.mockImplementation(impl);
};

const mockQuery = createMockQuery();

const ACTIVE_ROW = {
  plan: 'plus',
  status: 'active',
  paddle_customer_id: 'ctm_1',
  current_period_end: new Date(
    Date.now() + 30 * 24 * 3600 * 1000,
  ).toISOString(),
  cancel_at_period_end: false,
  past_due_since: null,
};

const mockEntitlementQueries = (subscriptionRow: unknown) => {
  mockRouteQueries((text: string) => {
    if (text.includes('from subscriptions')) {
      return Promise.resolve(
        makeQueryResult(subscriptionRow ? [subscriptionRow] : []),
      );
    }
    if (text.includes('from ai_usage')) {
      return Promise.resolve(makeQueryResult([{calls: 2}]));
    }
    return Promise.resolve(makeQueryResult([]));
  });
};

const makeApp = () => {
  const app = express();
  app.locals['query'] = mockQuery;
  // Mirrors server.ts: no user upsert in tests, so userId = supabase uid.
  app.locals['skipUserUpsert'] = true;
  app.get('/entitled', requireAuth, loadEntitlement(mockQuery), (req, res) => {
    res.json((req as EntitledRequest).entitlement);
  });
  app.get(
    '/plus-only',
    requireAuth,
    loadEntitlement(mockQuery),
    requirePlan('plus'),
    (_req, res) => {
      res.json({ok: true});
    },
  );
  app.get('/plan-without-entitlement', requirePlan('plus'), (_req, res) => {
    res.json({ok: true});
  });
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({error: (err as Error).message});
    },
  );
  return app;
};

const authed = (app: express.Express, path: string) =>
  request(app).get(path).set('Authorization', 'Bearer test-token');

describe('loadEntitlement', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    nockSupabaseGetUser('supabase-uid-1');
  });

  test('resolves free when the user has no subscription row', async () => {
    mockEntitlementQueries(null);
    const res = await authed(makeApp(), '/entitled');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      plan: 'free',
      status: null,
      aiUsed: 2,
      aiLimit: 5,
      periodEndsAt: null,
      paddleCustomerId: null,
      cancelAtPeriodEnd: false,
    });
  });

  test('resolves the paid plan for an active subscription', async () => {
    mockEntitlementQueries(ACTIVE_ROW);
    const res = await authed(makeApp(), '/entitled');
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('plus');
    expect(res.body.status).toBe('active');
    expect(res.body.aiLimit).toBe(100);
    expect(res.body.paddleCustomerId).toBe('ctm_1');
  });

  test('keeps access for a cancelled subscription before period end', async () => {
    mockEntitlementQueries({...ACTIVE_ROW, status: 'cancelled'});
    const res = await authed(makeApp(), '/entitled');
    expect(res.body.plan).toBe('plus');
  });

  test('lazily downgrades a cancelled subscription after period end', async () => {
    mockEntitlementQueries({
      ...ACTIVE_ROW,
      status: 'cancelled',
      current_period_end: new Date(Date.now() - 1000).toISOString(),
    });
    const res = await authed(makeApp(), '/entitled');
    expect(res.body.plan).toBe('free');
    expect(res.body.status).toBe('cancelled');
  });

  test('keeps access during the past_due grace period', async () => {
    mockEntitlementQueries({
      ...ACTIVE_ROW,
      status: 'past_due',
      past_due_since: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    });
    const res = await authed(makeApp(), '/entitled');
    expect(res.body.plan).toBe('plus');
  });

  test('lazily downgrades after the past_due grace period', async () => {
    mockEntitlementQueries({
      ...ACTIVE_ROW,
      status: 'past_due',
      past_due_since: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    });
    const res = await authed(makeApp(), '/entitled');
    expect(res.body.plan).toBe('free');
    expect(res.body.status).toBe('past_due');
  });
});

describe('loadEntitlement with an entitlement override', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    nockSupabaseGetUser('supabase-uid-1');
  });

  const mockOverrideQueries = (
    overridePlan: string | null,
    subscriptionRow: unknown,
  ) => {
    mockRouteQueries((text: string) => {
      if (text.includes('from entitlement_overrides')) {
        return Promise.resolve(
          makeQueryResult(overridePlan ? [{plan: overridePlan}] : []),
        );
      }
      if (text.includes('from subscriptions')) {
        return Promise.resolve(
          makeQueryResult(subscriptionRow ? [subscriptionRow] : []),
        );
      }
      if (text.includes('from ai_usage')) {
        return Promise.resolve(makeQueryResult([{calls: 2}]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
  };

  test('grants the override plan with no subscription at all', async () => {
    mockOverrideQueries('power', null);
    const res = await authed(makeApp(), '/entitled');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      plan: 'power',
      status: 'active',
      aiUsed: 2,
      aiLimit: -1,
      unlimited: true,
      periodEndsAt: null,
      paddleCustomerId: null,
      cancelAtPeriodEnd: false,
    });
  });

  test('override wins over an expired subscription and keeps its customer id', async () => {
    mockOverrideQueries('plus', {
      ...ACTIVE_ROW,
      status: 'expired',
      plan: 'power',
    });
    const res = await authed(makeApp(), '/entitled');
    expect(res.body.plan).toBe('plus');
    expect(res.body.status).toBe('active');
    expect(res.body.unlimited).toBe(true);
    expect(res.body.paddleCustomerId).toBe('ctm_1');
    expect(res.body.periodEndsAt).toBeNull();
  });

  test('an unknown override plan value is ignored', async () => {
    mockOverrideQueries('enterprise', null);
    const res = await authed(makeApp(), '/entitled');
    expect(res.body.plan).toBe('free');
    expect(res.body.unlimited).toBeUndefined();
  });
});

describe('requirePlan', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    nockSupabaseGetUser('supabase-uid-1');
  });

  test('403s a free user on a plus-gated route', async () => {
    mockEntitlementQueries(null);
    const res = await authed(makeApp(), '/plus-only');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'plan_required',
      requiredPlan: 'plus',
      plan: 'free',
      message: "This feature requires the Plus plan. You're on the Free plan.",
    });
  });

  test('lets a plus user through', async () => {
    mockEntitlementQueries(ACTIVE_ROW);
    const res = await authed(makeApp(), '/plus-only');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ok: true});
  });

  test('500s when loadEntitlement did not run first', async () => {
    const res = await request(makeApp()).get('/plan-without-entitlement');
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('loadEntitlement');
  });
});
