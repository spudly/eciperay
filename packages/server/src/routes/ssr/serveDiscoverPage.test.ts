import type {PipeableStream} from 'react-dom/server';
import express from 'express';
import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {attachSsrRoutes} from './attachSsrRoutes.js';
import type {DiscoverStreamRenderer} from './serveDiscoverPage.js';

const mockQuery = createMockQuery();

const fakeRender: DiscoverStreamRenderer = async (recipes, options) => {
  queueMicrotask(() => options.onShellReady?.());
  return {
    pipe(dest: NodeJS.WritableStream) {
      dest.end(
        `<html><body>${recipes.map(recipe => recipe.title).join(', ')}</body></html>`,
      );
      return dest;
    },
  } as unknown as PipeableStream;
};

const fakeShellErrorRender: DiscoverStreamRenderer = async (
  _recipes,
  options,
) => {
  queueMicrotask(() => options.onShellError?.(new Error('render failed')));
  return {
    pipe(dest: NodeJS.WritableStream) {
      return dest;
    },
  } as unknown as PipeableStream;
};

const fakeRejectingRender: DiscoverStreamRenderer = async () => {
  throw new Error('warm-up render failed');
};

const buildApp = (render: DiscoverStreamRenderer = fakeRender) => {
  const app = express();
  attachSsrRoutes(app, mockQuery, {discover: render});
  app.use((_req, res) => {
    res.status(200).type('text/html').send('<html>SPA fallback</html>');
  });
  return app;
};

const mockPublicDiscoverQueries = () => {
  mockQuery.mockResolvedValue(
    makeQueryResult([
      makeRecipeDetailRow({
        visibility: 'public',
        slug: 'pasta',
        user_id: 'owner-uuid',
      }),
    ]),
  );
};

describe('GET /discover (SSR, #622)', () => {
  test('streams the unified browse SSR HTML at /discover with a short public cache TTL (no redirect)', async () => {
    mockPublicDiscoverQueries();

    const res = await request(buildApp()).get('/discover');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['cache-control']).toContain('max-age=60');
    expect(res.headers['location']).toBeUndefined();
    expect(res.text).toContain('Test Recipe');
  });

  test('renders an empty feed as the page empty state, not an error', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(buildApp()).get('/discover');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<html><body></body></html>');
  });

  test('sends a non-cacheable 500 when the render shell fails', async () => {
    mockPublicDiscoverQueries();

    const res = await request(buildApp(fakeShellErrorRender)).get('/discover');

    expect(res.status).toBe(500);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['cache-control']).not.toContain('max-age=60');
  });

  test('marks the response no-store when the renderer rejects before returning a stream', async () => {
    mockPublicDiscoverQueries();

    const res = await request(buildApp(fakeRejectingRender)).get('/discover');

    expect(res.status).toBe(500);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['cache-control']).not.toContain('max-age=60');
  });

  test('falls through to the SPA when an Authorization header is present', async () => {
    mockPublicDiscoverQueries();

    const res = await request(buildApp())
      .get('/discover')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.text).toContain('SPA fallback');
  });
});
