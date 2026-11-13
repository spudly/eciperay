import type {Request, Response} from 'express';
import type {PipeableStream} from 'react-dom/server';

import {query as defaultQuery} from '../../db/query.js';
import {getParam} from '../../lib/getParam.js';
import {getShareTokenFromQuery} from '../../lib/getShareTokenFromQuery.js';
import {loadPublicRecipe} from '../../lib/loadPublicRecipe.js';
import type {renderPublicRecipeStreamDeterministic} from '../../lib/renderPublicRecipe.js';

type QueryFn = typeof defaultQuery;

export type PublicRecipeStreamRenderer =
  typeof renderPublicRecipeStreamDeterministic;

/**
 * Route-wiring tranche for #304: serve the public recipe page as streamed
 * server-rendered HTML at GET /recipe/:id/:slug, with the slug optional — GET
 * /recipe/:id serves the same page, whose rendered head declares the canonical
 * (slugged) URL.
 *
 * Anonymous only: the HTML is publicly cacheable, so a request carrying an
 * Authorization header or a share token returns `false` here and the caller
 * falls through to the SPA, which loads the personalized JSON view instead. A
 * slug mismatch redirects (301) to the canonical slug, mirroring the web host's
 * client-side canonical redirect. Denied and not-found loads both get a real
 * 404 — the SPA catch-all's soft-404 is what SSR replaces for this route.
 *
 * Returns true when the request was handled (HTML streamed, redirect, or 404
 * sent), false when the caller should fall through to the SPA.
 */
export const servePublicRecipePage = async (
  req: Request,
  res: Response,
  queryFn: QueryFn,
  render: PublicRecipeStreamRenderer,
): Promise<boolean> => {
  if (req.headers.authorization !== undefined) {
    return false;
  }
  if (getShareTokenFromQuery(req) !== undefined) {
    return false;
  }

  const id = getParam(req, 'id');
  const requestedSlug = getParam(req, 'slug');

  const result = await loadPublicRecipe({id, requestedSlug}, queryFn);

  if (result.kind === 'denied') {
    res.status(404).type('text/html');
    res.send('<h1>Recipe not found</h1>');
    return true;
  }

  if (result.body.slugMismatch) {
    res.redirect(301, `/recipe/${id}/${result.body.canonicalSlug}`);
    return true;
  }

  res.status(200).type('text/html');
  res.set('Cache-Control', 'public, max-age=60');

  // The renderer is async (its warm-up pass completes before the served
  // stream exists), so onShellReady can fire before the stream has been
  // assigned here — pipe from whichever of the two arrives second.
  let shellReady = false;
  let stream: PipeableStream | undefined;
  const pipeWhenReady = (): void => {
    if (shellReady && stream !== undefined) {
      stream.pipe(res);
    }
  };
  stream = await render(result.body, {
    onShellReady() {
      shellReady = true;
      pipeWhenReady();
    },
    onShellError() {
      if (!res.headersSent) {
        // The 200 path set a public cache TTL before rendering; an error
        // response must never inherit it — a transient render failure
        // would otherwise stay cacheable for the TTL.
        res.set('Cache-Control', 'no-store');
        res.status(500).type('text/html');
        res.send('<h1>Something went wrong</h1>');
      }
    },
    onError() {
      // React has already logged the render error; a mid-stream failure
      // cannot change the status, so the response simply ends short.
      if (!res.headersSent) {
        res.set('Cache-Control', 'no-store');
        res.status(500);
      }
    },
  });
  pipeWhenReady();
  return true;
};
