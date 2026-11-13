import {Writable} from 'node:stream';

import type {PublicRecipeResponse} from '@eciperay/types';
import {createTamaguiConfig, eciperayTheme, PublicRecipePage} from '@spudly/ui';
import type {
  PipeableStream,
  RenderToPipeableStreamOptions,
} from 'react-dom/server';
import {renderToPipeableStream} from 'react-dom/server';
// TamaguiProvider comes from @tamagui/core directly: the 'tamagui'
// package re-exports it through an extensionless path that this
// package's NodeNext module resolution cannot follow (the web
// package's bundler resolution can, which is why the web entry
// imports it from 'tamagui').
import {TamaguiProvider} from '@tamagui/core';

import {buildPublicRecipePageProps} from './buildPublicRecipePageProps.js';
import {buildPublicRecipeCanonicalUrl, getWebAppBaseUrl} from './seoUrls.js';

/**
 * The #304 Phase 0 spike renderer: renders the DS PublicRecipePage inside the
 * Express process with react-dom/server, fed by the server's own data access
 * (loadPublicRecipe) — no internal HTTP hop. The Tamagui setup mirrors the web
 * entry (packages/web/src/main.tsx): the DS config factory over the Eciperay
 * theme, light default theme. The route-wiring tranche (#517) serves it at GET
 * /recipe/:id/:slug behind the SSR_PUBLIC_RECIPE flag; the findings and
 * measurements live in docs/ssr-phase0-inventory.md. Still owed before the flag
 * can enable in production: a bundled/transpiled SSR runtime entry, because the
 * DS module graph ships untranspiled ESM plain Node cannot load (the Jest
 * pipeline and tsx dev entry apply the web substitutions; a bare Node
 * production entry does not).
 *
 * The render returns the `PipeableStream` from `renderToPipeableStream`
 * directly: wrapping it in a promise would defeat the streaming renderer — the
 * caller pipes the stream into the HTTP response (on `onShellReady`) for
 * improved TTFB and server-side Suspense, passing its own render callbacks
 * through `options`. Collecting the full HTML into a string is a testing need
 * only; that conversion lives in the test helper
 * `src/test/renderStreamToHtml.ts`.
 */
const serverTamaguiConfig = createTamaguiConfig(eciperayTheme);

export const renderPublicRecipeStream = (
  body: PublicRecipeResponse,
  options: RenderToPipeableStreamOptions,
): PipeableStream =>
  renderToPipeableStream(
    <TamaguiProvider
      config={serverTamaguiConfig}
      defaultTheme="light"
    >
      {/* The slug is optional on the route, so the server-rendered page
          itself declares the canonical URL (React hoists the link into
          the document head) — crawlers and shared links resolve to the
          slugged canonical address regardless of the requested form. */}
      <link
        rel="canonical"
        href={buildPublicRecipeCanonicalUrl(getWebAppBaseUrl(), {
          id: body.recipe.id,
          slug: body.canonicalSlug,
        })}
      />
      <PublicRecipePage {...buildPublicRecipePageProps(body)} />
    </TamaguiProvider>,
    options,
  );

/**
 * Collect one render of `body` into a string and discard it. A render error
 * rejects: a failed warm-up must surface like a failed render, not leave the
 * sheet half-saturated behind a successful response.
 */
const collectRender = (body: PublicRecipeResponse): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const sink = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
      final(callback) {
        resolve();
        callback();
      },
    });
    renderPublicRecipeStream(body, {
      onError: reject,
      onShellError: reject,
    }).pipe(sink);
  });

/**
 * Deterministic variant for the serving path: Tamagui's CSS registry is
 * process-global, and `TamaguiProvider` snapshots it (`config.getCSS()`) when
 * it renders — before its children have registered the styles they use. A cold
 * render's hoisted `<style>` block therefore misses rules its own markup
 * references, and the next render's block grows to include them, so consecutive
 * renders of the same page are not byte-identical until the registry saturates
 * (measured on the fixture recipe: render 1 differs, renders 2+ are
 * byte-identical). Hydration compares the served HTML against the client's
 * render, so the serving path cannot ship the cold form.
 *
 * The warm-up pass renders the same body once and discards the output,
 * registering exactly the rules that body needs; the returned stream's render
 * then snapshots a saturated registry and is byte-identical to any later render
 * of the same body in this process. The cost is one extra render per request
 * (~90 ms warm on the Phase 0 measurements) on a route whose responses carry a
 * public cache TTL.
 */
export const renderPublicRecipeStreamDeterministic = async (
  body: PublicRecipeResponse,
  options: RenderToPipeableStreamOptions,
): Promise<PipeableStream> => {
  await collectRender(body);
  return renderPublicRecipeStream(body, options);
};
