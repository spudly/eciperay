import nock from 'nock';
import request from 'supertest';
import type {QueryResult} from 'pg';

import {makeRecipeInput} from './test/fixtures/recipe.js';
import {makeQueryResult} from './test/fixtures/queryResult.js';
import {createMockQuery} from './test/mockQuery.js';
import {nockSupabaseGetUser} from './test/mockNockSupabase.js';
import {lazyTestApp} from './test/lazyTestApp.js';

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

/**
 * Routes mock queries by SQL. `subscriptionRow` null = free user. `recipeCount`
 * drives the free recipe cap; `aiCalls` the AI quota.
 */
const mockGatingQueries = (
  subscriptionRow: unknown,
  recipeCount = 0,
  aiCalls = 0,
) => {
  mockRouteQueries((text: string) => {
    if (text.includes('from subscriptions')) {
      return Promise.resolve(
        makeQueryResult(subscriptionRow ? [subscriptionRow] : []),
      );
    }
    if (text.includes('from ai_usage')) {
      return Promise.resolve(makeQueryResult([{calls: aiCalls}]));
    }
    if (text.includes('count(*) as count from recipes')) {
      return Promise.resolve(makeQueryResult([{count: String(recipeCount)}]));
    }
    if (text.includes('from meal_plans')) {
      return Promise.resolve(makeQueryResult([]));
    }
    return Promise.resolve(makeQueryResult([]));
  });
};

/**
 * Mocks an exhausted AI quota. The consumeAiCall INSERT returns 999 calls, over
 * the limit for the given plan (free: 5, plus: 100).
 */
const mockExhaustedQuota = (plan: 'free' | 'plus' = 'free') => {
  mockRouteQueries((text: string) => {
    if (text.includes('from subscriptions')) {
      return Promise.resolve(
        makeQueryResult(plan === 'free' ? [] : [PLUS_ROW]),
      );
    }
    if (text.includes('insert into ai_usage')) {
      return Promise.resolve(makeQueryResult([{calls: 999}]));
    }
    if (text.includes('from ai_usage')) {
      return Promise.resolve(makeQueryResult([{calls: 0}]));
    }
    return Promise.resolve(makeQueryResult([]));
  });
};

const PLUS_ROW = {
  plan: 'power',
  status: 'active',
  paddle_customer_id: 'ctm_1',
  current_period_end: new Date(
    Date.now() + 30 * 24 * 3600 * 1000,
  ).toISOString(),
  cancel_at_period_end: false,
  past_due_since: null,
};

const authed = (method: 'get' | 'post', path: string) =>
  request(getApp())[method](path).set('Authorization', 'Bearer test-token');

describe('billing gating (Phase 1)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    nockSupabaseGetUser('supabase-uid-1');
  });

  test('GET /api/meal-plans 403s for a free user', async () => {
    mockGatingQueries(null);
    const res = await authed('get', '/api/meal-plans');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'plan_required',
      requiredPlan: 'plus',
      plan: 'free',
    });
  });

  test('GET /api/meal-plans 200s for a paying user', async () => {
    mockGatingQueries(PLUS_ROW);
    const res = await authed('get', '/api/meal-plans');
    expect(res.status).toBe(200);
  });

  test('POST /api/recipes 402s a free user at the 50-recipe cap', async () => {
    mockGatingQueries(null, 50);
    const res = await authed('post', '/api/recipes').send(makeRecipeInput());
    expect(res.status).toBe(402);
    expect(res.body).toEqual({error: 'recipe_limit', used: 50, limit: 50});
  });

  test('POST /api/recipes passes a free user under the cap', async () => {
    mockGatingQueries(null, 3);
    // Cap check passes; the save itself is mocked to return nothing useful,
    // so we only assert we got past the 402 gate.
    const res = await authed('post', '/api/recipes').send(makeRecipeInput());
    expect(res.status).not.toBe(402);
  });

  test('POST /api/recipes never caps a paying user', async () => {
    mockRouteQueries((text: string) => {
      if (text.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([PLUS_ROW]));
      }
      if (text.includes('from ai_usage')) {
        return Promise.resolve(makeQueryResult([{calls: 0}]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    const res = await authed('post', '/api/recipes').send(makeRecipeInput());
    expect(res.status).not.toBe(402);
    // The recipe-count query must never run for unlimited plans.
    expect(
      mockQuery.mock.calls.some(args =>
        args[0].includes('count(*) as count from recipes'),
      ),
    ).toBe(false);
  });
});

describe('AI quota 402s', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    nockSupabaseGetUser('supabase-uid-1');
  });

  test('POST /api/import/url 402s when AI quota is exhausted', async () => {
    nock('https://recipe.example.com')
      .get('/plain')
      .reply(200, '<html><body>no schema here</body></html>');
    mockExhaustedQuota('free');
    const res = await authed('post', '/api/recipes/import/url').send({
      url: 'https://recipe.example.com/plain',
    });
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('ai_quota_exhausted');
  });

  test('POST /api/import/image 402s when AI quota is exhausted', async () => {
    mockExhaustedQuota('plus');
    const res = await authed('post', '/api/recipes/import/image').send({
      imageBase64: 'abc',
    });
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('ai_quota_exhausted');
  });

  test('POST /api/import/text 402s when AI quota is exhausted', async () => {
    mockExhaustedQuota('plus');
    const res = await authed('post', '/api/recipes/import/text').send({
      text: 'Pasta with tomato sauce. Boil pasta. Add sauce. Serve hot.',
    });
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('ai_quota_exhausted');
  });

  test('GET /api/ai/substitutions 402s when AI quota is exhausted', async () => {
    mockExhaustedQuota('free');
    const res = await authed(
      'get',
      '/api/recipes/recipe-uuid-1/ai/substitutions?missing=butter',
    );
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('ai_quota_exhausted');
  });

  test('POST /api/recipes/ai/generate-description 402s when quota exhausted', async () => {
    mockExhaustedQuota('free');
    const res = await authed(
      'post',
      '/api/recipes/ai/generate-description',
    ).send({title: 'Pasta'});
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('ai_quota_exhausted');
  });

  test('POST /api/recipes/ai/generate-image 402s when quota exhausted', async () => {
    mockExhaustedQuota('free');
    const res = await authed('post', '/api/recipes/ai/generate-image').send({
      title: 'Pasta',
    });
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('ai_quota_exhausted');
  });
});
