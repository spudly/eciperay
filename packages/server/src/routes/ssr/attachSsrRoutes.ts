import type {Express} from 'express';

import {query as defaultQuery} from '../../db/query.js';

import {
  servePublicRecipePage,
  type PublicRecipeStreamRenderer,
} from './servePublicRecipePage.js';

type QueryFn = typeof defaultQuery;

/**
 * Attach the #304 SSR routes. Gated on SSR_PUBLIC_RECIPE=1 (default off): the
 * renderer pulls in the design-system module graph, which plain Node cannot
 * load untranspiled — the route stays dark until the bundled SSR runtime entry
 * lands (the follow-on tranche recorded on #304). The renderer is imported
 * lazily inside the handler for the same reason: a static import would load the
 * DS graph on every server start, including API-only runs. Tests inject a
 * renderer directly.
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

  app.get('/recipe/:id/:slug', (req, res, next) => {
    const run = async (): Promise<void> => {
      const render =
        injectedRender ??
        (await import('../../lib/renderPublicRecipe.js'))
          .renderPublicRecipeStream;
      const handled = await servePublicRecipePage(req, res, queryFn, render);
      if (!handled) {
        next();
      }
    };
    run().catch(next);
  });
};
