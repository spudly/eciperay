import type {Request, Response} from 'express';
import type {PipeableStream} from 'react-dom/server';

import {query as defaultQuery} from '../../db/query.js';
import {loadPublicDiscover} from '../../lib/loadPublicDiscover.js';
import type {renderDiscoverStreamDeterministic} from '../../lib/renderDiscover.js';

type QueryFn = typeof defaultQuery;

export type DiscoverStreamRenderer = typeof renderDiscoverStreamDeterministic;

/**
 * Serve the unified browse page as streamed server-rendered HTML at GET
 * /recipes (#622, Stephen's 2026-11-21 decision: /recipes survives, /discover
 * is removed entirely): the one unified browse page, served at this URL — never
 * a redirect.
 *
 * Anonymous only, mirroring servePublicRecipePage: the HTML is publicly
 * cacheable and carries only the public browse content, so a request carrying
 * an Authorization header returns `false` here and the caller falls through to
 * the SPA, which renders the same page at /recipes and applies signed-in
 * personalization client-side once auth resolves.
 *
 * Returns true when the request was handled (HTML streamed or an error sent),
 * false when the caller should fall through to the SPA.
 */
export const serveDiscoverPage = async (
  req: Request,
  res: Response,
  queryFn: QueryFn,
  render: DiscoverStreamRenderer,
): Promise<boolean> => {
  if (req.headers.authorization !== undefined) {
    return false;
  }

  const recipes = await loadPublicDiscover(queryFn);

  res.status(200).type('text/html');
  res.set('Cache-Control', 'public, max-age=60');

  // The renderer is async (its warm-up pass completes before the
  // served stream exists), so onShellReady can fire before the stream
  // has been assigned here — pipe from whichever arrives second.
  let shellReady = false;
  let stream: PipeableStream | undefined;
  const pipeWhenReady = (): void => {
    if (shellReady && stream !== undefined) {
      stream.pipe(res);
    }
  };
  try {
    stream = await render(recipes, {
      onShellReady() {
        shellReady = true;
        pipeWhenReady();
      },
      onShellError() {
        if (!res.headersSent) {
          res.set('Cache-Control', 'no-store');
          res.status(500).type('text/html');
          res.send('<h1>Something went wrong</h1>');
        }
      },
      onError() {
        if (!res.headersSent) {
          res.set('Cache-Control', 'no-store');
          res.status(500);
        }
      },
    });
  } catch (error) {
    if (!res.headersSent) {
      res.set('Cache-Control', 'no-store');
      res.status(500);
    }
    throw error;
  }
  pipeWhenReady();
  return true;
};
