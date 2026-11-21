import path from 'node:path';
import {pathToFileURL} from 'node:url';

import type {Express} from 'express';

import {query as defaultQuery} from '../../db/query.js';

import {
  serveDiscoverPage,
  type DiscoverStreamRenderer,
} from './serveDiscoverPage.js';
import {
  servePublicRecipePage,
  type PublicRecipeStreamRenderer,
} from './servePublicRecipePage.js';

type QueryFn = typeof defaultQuery;

export type SsrRenderers = {
  recipe?: PublicRecipeStreamRenderer;
  discover?: DiscoverStreamRenderer;
};

/**
 * Load the real recipe renderer. The renderer pulls in the design-system module
 * graph, which plain Node cannot load untranspiled, so production loads the
 * bundled SSR runtime entry instead (scripts/buildSsrBundle.mjs, built into
 * dist-ssr/ by the Dockerfile): SSR_RENDERER_BUNDLE_PATH names that bundle
 * file. Everywhere else (the tsx dev entry, the Jest pipeline — both apply the
 * web substitutions and transpile the DS graph) the source module is imported
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
 * Load the real discover renderer, mirroring loadRenderer: in production it is
 * the sibling bundle file the same build produces (dist-ssr/renderDiscover.mjs,
 * next to the recipe bundle named by SSR_RENDERER_BUNDLE_PATH); elsewhere the
 * source module is imported directly.
 */
const loadDiscoverRenderer = async (): Promise<DiscoverStreamRenderer> => {
  const bundlePath = process.env['SSR_RENDERER_BUNDLE_PATH'];
  if (bundlePath !== undefined) {
    const discoverBundlePath = path.join(
      path.dirname(bundlePath),
      'renderDiscover.mjs',
    );
    const bundle = (await import(pathToFileURL(discoverBundlePath).href)) as {
      renderDiscoverStreamDeterministic: DiscoverStreamRenderer;
    };
    return bundle.renderDiscoverStreamDeterministic;
  }
  return (await import('../../lib/renderDiscover.js'))
    .renderDiscoverStreamDeterministic;
};

/**
 * Attach the #304 SSR routes, plus the #622 /discover SSR route. Gated on
 * SSR_PUBLIC_RECIPE=1 (default off) so the routes stay dark until the
 * deployment enables them. The renderers are imported lazily inside the
 * handlers: a static import would load the DS graph on every server start,
 * including API-only runs. Tests inject renderers directly — either a single
 * recipe renderer (the original shape) or a {recipe, discover} pair.
 */
export const attachSsrRoutes = (
  app: Express,
  queryFn: QueryFn = defaultQuery,
  injectedRender?: PublicRecipeStreamRenderer | SsrRenderers,
): void => {
  const injected: SsrRenderers =
    typeof injectedRender === 'function'
      ? {recipe: injectedRender}
      : (injectedRender ?? {});
  if (
    injected.recipe === undefined &&
    injected.discover === undefined &&
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
      const render = injected.recipe ?? (await loadRenderer());
      const handled = await servePublicRecipePage(req, res, queryFn, render);
      if (!handled) {
        next();
      }
    };
    run().catch(next);
  });

  // /discover is the unified browse page itself (#622): served here
  // with the public browse content for SEO, never redirected. The
  // client renders the same page at this URL and applies signed-in
  // personalization once auth resolves.
  app.get('/discover', (req, res, next) => {
    const run = async (): Promise<void> => {
      const render = injected.discover ?? (await loadDiscoverRenderer());
      const handled = await serveDiscoverPage(req, res, queryFn, render);
      if (!handled) {
        next();
      }
    };
    run().catch(next);
  });
};
