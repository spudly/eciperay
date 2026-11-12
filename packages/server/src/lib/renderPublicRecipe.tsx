import {Writable} from 'node:stream';
import type {ReactNode} from 'react';

import type {PublicRecipeResponse} from '@eciperay/types';
import {createTamaguiConfig, eciperayTheme, PublicRecipePage} from '@spudly/ui';
import {renderToPipeableStream} from 'react-dom/server';
// TamaguiProvider comes from @tamagui/core directly: the 'tamagui'
// package re-exports it through an extensionless path that this
// package's NodeNext module resolution cannot follow (the web
// package's bundler resolution can, which is why the web entry
// imports it from 'tamagui').
import {TamaguiProvider} from '@tamagui/core';

import {buildPublicRecipePageProps} from './buildPublicRecipePageProps.js';

/**
 * The #304 Phase 0 spike renderer: renders the DS PublicRecipePage to HTML
 * inside the Express process with react-dom/server, fed by the server's own
 * data access (loadPublicRecipe) — no internal HTTP hop. The Tamagui setup
 * mirrors the web entry (packages/web/src/main.tsx): the DS config factory over
 * the Eciperay theme, light default theme. Not wired to a route yet — the spike
 * findings and measurements live in docs/ssr-phase0-inventory.md; they support
 * keeping SSR as a rendering layer inside `server` (no package merge), with the
 * route wiring tranche owing a bundled/transpiled SSR entry, because the DS
 * module graph ships untranspiled ESM plain Node cannot load.
 *
 * Rendering uses `renderToPipeableStream` — the streaming renderer the route
 * wiring tranche will pipe straight into the HTTP response. This spike collects
 * the piped output into a string (resolving on `onAllReady`, so the collected
 * HTML is the complete page) so the experiment can measure and assert on the
 * full document; a render error rejects instead of returning partial HTML.
 */
const serverTamaguiConfig = createTamaguiConfig(eciperayTheme);

/**
 * Collect a `renderToPipeableStream` render of `element` into a string,
 * resolving on `onAllReady` with the complete document. A render error rejects
 * instead of resolving with partial/fallback HTML: React can recover from an
 * error inside a Suspense boundary and finish with fallback markup, so without
 * the `onError: reject` wiring a failed page would silently ship its fallback.
 * Exported for the regression test of that rejection path (a controlled
 * throwing component cannot be driven through the recipe page's own props).
 */
export const renderElementToHtml = (element: ReactNode): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const chunks: string[] = [];
    const output = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
      final(callback) {
        resolve(chunks.join(''));
        callback();
      },
    });
    const {pipe} = renderToPipeableStream(element, {
      onAllReady: () => {
        pipe(output);
      },
      onShellError: reject,
      onError: reject,
    });
  });

export const renderPublicRecipeHtml = (
  body: PublicRecipeResponse,
): Promise<string> =>
  renderElementToHtml(
    <TamaguiProvider
      config={serverTamaguiConfig}
      defaultTheme="light"
    >
      <PublicRecipePage {...buildPublicRecipePageProps(body)} />
    </TamaguiProvider>,
  );
