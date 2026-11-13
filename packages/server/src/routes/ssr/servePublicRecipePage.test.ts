import type {PipeableStream} from 'react-dom/server';
import express from 'express';
import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {attachSsrRoutes} from './attachSsrRoutes.js';
import type {PublicRecipeStreamRenderer} from './servePublicRecipePage.js';

const mockQuery = createMockQuery();

const fakeRender: PublicRecipeStreamRenderer = (body, options) => {
  // Mirror react-dom/server: onShellReady fires after render returns,
  // and the handler pipes the stream into the response from there.
  queueMicrotask(() => options.onShellReady?.());
  return {
    pipe(dest: NodeJS.WritableStream) {
      dest.end(`<html><body>${body.recipe.title}</body></html>`);
      return dest;
    },
  } as unknown as PipeableStream;
};

const buildApp = () => {
  const app = express();
  attachSsrRoutes(app, mockQuery, fakeRender);
  app.use((_req, res) => {
    res.status(200).type('text/html').send('<html>SPA fallback</html>');
  });
  return app;
};

const mockPublicRecipeQueries = (
  row = makeRecipeDetailRow({
    visibility: 'public',
    slug: 'pasta',
    user_id: 'owner-uuid',
  }),
) => {
  mockQuery.mockImplementation(((sql: string) => {
    if (sql.includes('recipe_ratings rr')) {
      return Promise.resolve(makeQueryResult([]));
    }
    return Promise.resolve(makeQueryResult([row]));
  }) as typeof mockQuery);
};

describe('GET /recipe/:id/:slug (SSR)', () => {
  test('streams SSR HTML with a short public cache TTL for a public recipe', async () => {
    mockPublicRecipeQueries();

    const res = await request(buildApp()).get('/recipe/recipe-uuid-1/pasta');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['cache-control']).toContain('max-age=60');
    expect(res.text).toContain('Test Recipe');
  });

  test('redirects a slug mismatch to the canonical slug', async () => {
    mockPublicRecipeQueries();

    const res = await request(buildApp()).get('/recipe/recipe-uuid-1/wrong');

    expect(res.status).toBe(301);
    expect(res.headers['location']).toBe('/recipe/recipe-uuid-1/pasta');
  });

  test('returns a real 404 for a missing recipe', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(buildApp()).get('/recipe/missing/pasta');

    expect(res.status).toBe(404);
    expect(res.text).toContain('Recipe not found');
  });

  test('returns a real 404 for a non-public recipe', async () => {
    mockPublicRecipeQueries(
      makeRecipeDetailRow({
        visibility: 'private',
        slug: 'pasta',
        user_id: 'owner-uuid',
      }),
    );

    const res = await request(buildApp()).get('/recipe/recipe-uuid-1/pasta');

    expect(res.status).toBe(404);
  });

  test('falls through to the SPA when an Authorization header is present', async () => {
    mockPublicRecipeQueries();

    const res = await request(buildApp())
      .get('/recipe/recipe-uuid-1/pasta')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.text).toContain('SPA fallback');
  });
});
