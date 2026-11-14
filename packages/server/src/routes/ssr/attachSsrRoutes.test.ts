import {fileURLToPath} from 'node:url';

import {jest} from '@jest/globals';
import type {PipeableStream} from 'react-dom/server';
import express from 'express';
import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {createMockQuery} from '../../test/mockQuery.js';

import type {PublicRecipeStreamRenderer} from './servePublicRecipePage.js';

const mockQuery = createMockQuery();

// Stand-in for the source renderer so the loader's source branch can be
// exercised without rendering the DS graph (the real source render is
// covered by renderPublicRecipe.test.ts).
const fakeSourceRender: PublicRecipeStreamRenderer = async (body, options) => {
  queueMicrotask(() => options.onShellReady?.());
  return {
    pipe(dest: NodeJS.WritableStream) {
      dest.end(`<html><body>Source: ${body.recipe.title}</body></html>`);
      return dest;
    },
  } as unknown as PipeableStream;
};

jest.unstable_mockModule('../../lib/renderPublicRecipe.js', () => ({
  renderPublicRecipeStream: fakeSourceRender,
  renderPublicRecipeStreamDeterministic: fakeSourceRender,
}));

const {attachSsrRoutes} = await import('./attachSsrRoutes.js');

const mockPublicRecipeQueries = () => {
  const row = makeRecipeDetailRow({
    visibility: 'public',
    slug: 'pasta',
    user_id: 'owner-uuid',
  });
  mockQuery.mockImplementation(((sql: string) => {
    if (sql.includes('recipe_ratings rr')) {
      return Promise.resolve(makeQueryResult([]));
    }
    return Promise.resolve(makeQueryResult([row]));
  }) as typeof mockQuery);
};

const buildGateApp = () => {
  const app = express();
  attachSsrRoutes(app, mockQuery);
  app.use((_req, res) => {
    res.status(200).type('text/html').send('<html>SPA fallback</html>');
  });
  return app;
};

describe('attachSsrRoutes gate', () => {
  test('attaches nothing when SSR_PUBLIC_RECIPE is unset and no renderer is injected', async () => {
    const app = express();
    attachSsrRoutes(app, mockQuery);
    app.use((_req, res) => {
      res.status(200).type('text/html').send('<html>SPA fallback</html>');
    });

    const res = await request(app).get('/recipe/recipe-uuid-1/pasta');

    expect(res.status).toBe(200);
    expect(res.text).toContain('SPA fallback');
  });
});

describe('attachSsrRoutes renderer loading', () => {
  const originalEnv = {...process.env};

  afterEach(() => {
    process.env = {...originalEnv};
  });

  test('loads the bundled renderer named by SSR_RENDERER_BUNDLE_PATH', async () => {
    process.env['SSR_PUBLIC_RECIPE'] = '1';
    process.env['SSR_RENDERER_BUNDLE_PATH'] = fileURLToPath(
      new URL('../../test/fixtures/fakeSsrBundle.mjs', import.meta.url),
    );
    mockPublicRecipeQueries();

    const res = await request(buildGateApp()).get(
      '/recipe/recipe-uuid-1/pasta',
    );

    expect(res.status).toBe(200);
    expect(res.text).toContain('Bundled: Test Recipe');
  });

  test('loads the source renderer when no bundle path is configured', async () => {
    process.env['SSR_PUBLIC_RECIPE'] = '1';
    delete process.env['SSR_RENDERER_BUNDLE_PATH'];
    mockPublicRecipeQueries();

    const res = await request(buildGateApp()).get(
      '/recipe/recipe-uuid-1/pasta',
    );

    expect(res.status).toBe(200);
    expect(res.text).toContain('Source: Test Recipe');
  });
});
