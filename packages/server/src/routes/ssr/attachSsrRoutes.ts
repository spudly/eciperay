import {pathToFileURL} from 'node:url';

import type {Express} from 'express';

import {query as defaultQuery} from '../../db/query.js';

import {
  servePublicRecipePage,
  type PublicRecipeStreamRenderer,
} from './servePublicRecipePage.js';

type QueryFn = typeof defaultQuery;

/**
 * Load the real renderer. The renderer pulls in the design-system module graph,
 * which plain Node cannot load untranspiled, so production loads the bundled
 * SSR runtime entry instead (scripts/buildSsrBundle.mjs, built into dist-ssr/
 * by the Dockerfile): SSR_RENDERER_BUNDLE_PATH names that bundle file.
 * Everywhere else (the tsx dev entry, the Jest pipeline — both apply the web
 * substitutions and transpile the DS graph) the source module is imported
 * directly.
 */
const loadRenderer = async (): Promise<PublicRecipeStreamRenderer> => {
  const bundlePath = process.env['SSR_RENDERER_BUNDLE_PATH'];
  if (bundlePath !== undefined) {
    const bundle = (await import(pathToFileURL(bundlePath).href)) as {
      renderPublicRecipeStreamDeterministic: PublicRecipeStreamRenderer;
    };
    return bundle.renderPublicRecipeStreamDeterministic;
  }
  return (await import('../../lib/renderPublicRecipe.js'))
    .renderPublicRecipeStreamDeterministic;
};

/**
 * Attach the #304 SSR routes. Gated on SSR_PUBLIC_RECIPE=1 (default off) so the
 * route stays dark until the deployment enables it. The renderer is imported
 * lazily inside the handler: a static import would load the DS graph on every
 * server start, including API-only runs. Tests inject a renderer directly.
 */
export const attachSsrRoutes = (
  app: Express,
  queryFn: QueryFn = defaultQuery,
  injectedRender?: PublicRecipeStreamRenderer,
): void => {
  if (
    injectedRender === undefined &&
    process.env['SSR_PUBLIC_RECIPE'] !== '1'
  ) {
    return;
  }

  // The slug is optional: /recipe/:id serves the page directly (the
  // canonical URL is declared in the rendered head — see
  // renderPublicRecipe), while a present-but-wrong slug 301-redirects to
  // the canonical slug inside servePublicRecipePage.
  app.get(['/recipe/:id/:slug', '/recipe/:id'], (req, res, next) => {
    const run = async (): Promise<void> => {
      const render = injectedRender ?? (await loadRenderer());
      const handled = await servePublicRecipePage(req, res, queryFn, render);
      if (!handled) {
        next();
      }
    };
    run().catch(next);
  });
};
