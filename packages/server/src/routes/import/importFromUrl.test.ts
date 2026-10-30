import Anthropic from '@anthropic-ai/sdk';
import nock from 'nock';
import {jest} from '@jest/globals';
import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {
  anthropicCreateSpy,
  nockAnthropicMessage,
} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {mockBillingMetered, mockBillingPlan} from '../../test/mockBilling.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

// Captured before any test spies on globalThis.fetch: a spy left in
// place would otherwise delegate to the previous test's (reset) mock
// instead of the real fetch, breaking later tests' auth and fetches.
const REAL_FETCH = globalThis.fetch;

const SCHEMA_ORG_HTML = `<html><head>
<script type="application/ld+json">
{"@type":"Recipe","name":"Pasta","recipeYield":"4",
"recipeIngredient":["200g pasta"],
"recipeInstructions":[{"text":"Boil water"}]}
</script></head></html>`;

const PLAIN_HTML =
  '<html><body>Just a recipe page with no schema.</body></html>';

const CLAUDE_RESPONSE = JSON.stringify({
  title: 'AI Parsed Pasta',
  description: 'A simple pasta dish.',
  servings: 2,
  prepTimeMin: null,
  cookTimeMin: null,
  sourceUrl: 'https://recipe.example.com',
  ingredients: [
    {
      sortOrder: 0,
      name: 'pasta',
      quantity: 100,
      unit: 'g',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Cook pasta'}],
});

const mockSaveFlow = () => {
  mockBillingPlan(mockQuery, 'plus');
  mockQuery
    .mockResolvedValueOnce(makeQueryResult([]))
    // Duplicate check (#296): no candidates in the user's library.
    .mockResolvedValueOnce(makeQueryResult([]))
    .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
    .mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({title: 'Pasta'})]),
    );
};

// An existing library recipe identical to the schema.org fixture below
// (schema.org ingredients keep the raw line as the name, quantity/unit null).
const DUPLICATE_CANDIDATE_ROW = {
  id: 'recipe-uuid-9',
  title: 'Pasta',
  ingredients: [
    {name: '200g pasta', quantity: null, unit: null, notes: null, isOptional: false},
  ],
};

describe('POST /recipes/import/url', () => {
  test('returns 201 RecipeDetail from schema.org JSON-LD when present', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/').reply(200, SCHEMA_ORG_HTML);
    mockSaveFlow();
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'https://recipe.example.com/'});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Pasta');
    expect(res.body.servings).toBe(4);
    expect(res.body.userId).toBe('user-uuid-1');
  });

  test('falls back to Claude when no schema.org Recipe found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/plain').reply(200, PLAIN_HTML);
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockBillingMetered(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(
        makeQueryResult([makeRecipeDetailRow({title: 'AI Parsed Pasta'})]),
      );
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'https://recipe.example.com/plain'});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('AI Parsed Pasta');
  });

  test('returns 409 with the duplicate warning when the recipe already exists (#296)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/').reply(200, SCHEMA_ORG_HTML);
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([DUPLICATE_CANDIDATE_ROW]));
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'https://recipe.example.com/'});
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('duplicate_recipe');
    expect(res.body.duplicate).toEqual({
      recipeId: 'recipe-uuid-9',
      title: 'Pasta',
    });
    expect(res.body.message).toContain('already exists in your library');
    const insertCall = mockQuery.mock.calls.find(args =>
      String(args[0]).includes('insert into recipes'),
    );
    expect(insertCall).toBeUndefined();
  });

  test('returns 409 without refunding the AI call when the Claude fallback parse duplicates (#296)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/plain').reply(200, PLAIN_HTML);
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockBillingMetered(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            id: 'recipe-uuid-9',
            title: 'AI Parsed Pasta',
            ingredients: [
              {
                name: 'pasta',
                quantity: 100,
                unit: 'g',
                notes: null,
                isOptional: false,
              },
            ],
          },
        ]),
      );
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'https://recipe.example.com/plain'});
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('duplicate_recipe');
    // The parse succeeded, so its AI call stays charged: no refund on the
    // duplicate path, or repeated duplicate imports would bypass the
    // monthly quota entirely (#296).
    const refundCall = mockQuery.mock.calls.find(args =>
      args[0].includes('update ai_usage'),
    );
    expect(refundCall).toBeUndefined();
    const insertCall = mockQuery.mock.calls.find(args =>
      String(args[0]).includes('insert into recipes'),
    );
    expect(insertCall).toBeUndefined();
  });

  test('imports anyway with allowDuplicate after the warning (#296)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/').reply(200, SCHEMA_ORG_HTML);
    // The duplicate lookup is skipped entirely, so the mock sequence is
    // the plain save flow minus the candidate response.
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(
        makeQueryResult([makeRecipeDetailRow({title: 'Pasta'})]),
      );
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'https://recipe.example.com/', allowDuplicate: true});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Pasta');
  });

  test('returns 400 when URL is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'not-a-url'});
    expect(res.status).toBe(400);
  });

  test('returns 402 when a free user at the recipe cap imports by URL', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/').reply(200, SCHEMA_ORG_HTML);
    mockBillingPlan(mockQuery, 'free');
    mockQuery.mockResolvedValueOnce(makeQueryResult([{count: '50'}]));
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'https://recipe.example.com/'});
    expect(res.status).toBe(402);
    expect(res.body).toEqual({error: 'recipe_limit', used: 50, limit: 50});
  });

  test('returns 402 from the atomic recheck when the cap is hit mid-import', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/').reply(200, SCHEMA_ORG_HTML);
    mockBillingPlan(mockQuery, 'free');
    // Early check passes (49 < 50), but the atomic recheck during save sees 50.
    mockQuery.mockResolvedValueOnce(makeQueryResult([{count: '49'}]));
    mockQuery.mockResolvedValueOnce(makeQueryResult([{count: '50'}]));
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'https://recipe.example.com/'});
    expect(res.status).toBe(402);
    expect(res.body).toEqual({error: 'recipe_limit', used: 50, limit: 50});
  });

  test('returns 402 from the early cap check without fetching the page', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'free');
    // Cap already hit (50 >= 50), so the page is never fetched.
    mockQuery.mockResolvedValueOnce(makeQueryResult([{count: '50'}]));
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'https://recipe.example.com/'});
    expect(res.status).toBe(402);
    expect(res.body).toEqual({error: 'recipe_limit', used: 50, limit: 50});
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .send({url: 'https://x.com'});
    expect(res.status).toBe(401);
  });

  test('returns 422 with a fetch message when the page returns a non-ok status (#297)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    nock('https://recipe.example.com').get('/bad').reply(403, 'Forbidden');
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer <redacted>')
      .send({url: 'https://recipe.example.com/bad'});
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error:
        "We couldn't fetch that page \u2014 the site may be blocking imports. Try pasting the recipe text instead.",
    });
  });

  test('returns 422 with a fetch message when fetch resolves with a non-ok response (#297)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    // nock does not reliably intercept fetch; mock it directly so the
    // `!response.ok` branch in fetchPage is exercised.
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input, init) => {
        if (typeof input === 'string' && input.includes('recipe.example.com')) {
          return Promise.resolve({ok: false, status: 502} as Response);
        }
        return REAL_FETCH(input, init);
      });

    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer <redacted>')
      .send({url: 'https://recipe.example.com/unavailable'});
    fetchSpy.mockRestore();
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error:
        "We couldn't fetch that page \u2014 the site may be blocking imports. Try pasting the recipe text instead.",
    });
  });

  test('returns 422 with a fetch message when the fetch itself fails (#297)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input, init) => {
        if (typeof input === 'string' && input.includes('recipe.example.com')) {
          return Promise.reject(new Error('getaddrinfo ENOTFOUND'));
        }
        return REAL_FETCH(input, init);
      });

    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer <redacted>')
      .send({url: 'https://recipe.example.com/down'});
    fetchSpy.mockRestore();
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error:
        "We couldn't fetch that page \u2014 the site may be blocking imports. Try pasting the recipe text instead.",
    });
  });

  test('returns 422 with a no-recipe message when the page contains no recipe (#297)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/plain').reply(200, PLAIN_HTML);
    // Claude cannot extract a recipe from the page text, so its reply
    // fails recipe-schema validation (AiResponseParseError).
    nockAnthropicMessage('This page is not a recipe.');
    mockBillingMetered(mockQuery, 'plus');
    // One more response for refundAiCall's UPDATE on the failure path.
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer <redacted>')
      .send({url: 'https://recipe.example.com/plain'});
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: "That page doesn't appear to contain a recipe.",
    });
  });

  test('returns 502 AI service error for a genuine provider failure (#297)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/plain').reply(200, PLAIN_HTML);
    anthropicCreateSpy.mockRejectedValueOnce(
      new Anthropic.APIError(500, undefined, 'AI failed', undefined),
    );
    mockBillingMetered(mockQuery, 'plus');
    // One more response for refundAiCall's UPDATE on the failure path.
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post('/api/recipes/import/url')
      .set('Authorization', 'Bearer <redacted>')
      .send({url: 'https://recipe.example.com/plain'});
    expect(res.status).toBe(502);
    expect(res.body).toEqual({error: 'AI service error'});
  });
});
