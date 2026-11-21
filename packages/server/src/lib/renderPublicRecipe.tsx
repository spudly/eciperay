import type {PublicRecipeResponse} from '@eciperay/types';
import {PublicRecipePage} from '@spudly/ui';
import type {
  PipeableStream,
  RenderToPipeableStreamOptions,
} from 'react-dom/server';

import {buildPublicRecipePageProps} from './buildPublicRecipePageProps.js';
import {
  renderDeterministically,
  renderServerPageStream,
} from './renderServerPage.js';
import {buildPublicRecipeCanonicalUrl, getWebAppBaseUrl} from './seoUrls.js';

/**
 * The #304 Phase 0 spike renderer: renders the DS PublicRecipePage inside the
 * Express process with react-dom/server, fed by the server's own data access
 * (loadPublicRecipe) — no internal HTTP hop. The shared Tamagui/Voice setup
 * lives in renderServerPage.tsx. The route-wiring tranche (#517) serves it at
 * GET /recipe/:id/:slug behind the SSR_PUBLIC_RECIPE flag; the findings and
 * measurements live in docs/ssr-phase0-inventory.md. Production loads this
 * module through the bundled SSR runtime entry (scripts/buildSsrBundle.mjs →
 * dist-ssr/renderPublicRecipe.mjs, wired in attachSsrRoutes via
 * SSR_RENDERER_BUNDLE_PATH), because the DS module graph ships untranspiled ESM
 * plain Node cannot load (the Jest pipeline and tsx dev entry apply the web
 * substitutions; a bare Node production entry does not).
 *
 * Collecting the full HTML into a string is a testing need only; that
 * conversion lives in the test helper `src/test/renderStreamToHtml.ts`.
 */
export const renderPublicRecipeStream = (
  body: PublicRecipeResponse,
  options: RenderToPipeableStreamOptions,
): PipeableStream =>
  renderServerPageStream(
    <>
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
    </>,
    options,
  );

/**
 * Deterministic variant for the serving path — see renderServerPage.tsx for the
 * Tamagui CSS registry warm-up rationale.
 */
export const renderPublicRecipeStreamDeterministic = (
  body: PublicRecipeResponse,
  options: RenderToPipeableStreamOptions,
): Promise<PipeableStream> =>
  renderDeterministically(
    renderOptions => renderPublicRecipeStream(body, renderOptions),
    options,
  );
