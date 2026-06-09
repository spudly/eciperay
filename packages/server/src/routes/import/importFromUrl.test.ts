import nock from 'nock';
import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

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
  description: null,
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
  mockQuery
    .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
    .mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({title: 'Pasta'})]),
    );
};

describe('POST /recipes/import/url', () => {
  test('returns 201 RecipeDetail from schema.org JSON-LD when present', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/').reply(200, SCHEMA_ORG_HTML);
    mockSaveFlow();
    const res = await request(app)
      .post('/recipes/import/url')
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
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(
        makeQueryResult([makeRecipeDetailRow({title: 'AI Parsed Pasta'})]),
      );
    const res = await request(app)
      .post('/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'https://recipe.example.com/plain'});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('AI Parsed Pasta');
  });

  test('returns 400 when URL is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'not-a-url'});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/recipes/import/url')
      .send({url: 'https://x.com'});
    expect(res.status).toBe(401);
  });

  test('returns 500 when fetched page returns a non-ok status', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nock('https://recipe.example.com').get('/bad').reply(404, 'Not Found');
    const res = await request(app)
      .post('/recipes/import/url')
      .set('Authorization', 'Bearer valid-token')
      .send({url: 'https://recipe.example.com/bad'});
    expect(res.status).toBe(500);
  });
});
