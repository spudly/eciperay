import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {DiscoverPage} from '@spudly/ui';
import type {
  PipeableStream,
  RenderToPipeableStreamOptions,
} from 'react-dom/server';

import {buildDiscoverPageProps} from './buildDiscoverPageProps.js';
import {
  renderDeterministically,
  renderServerPageStream,
} from './renderServerPage.js';
import {getWebAppBaseUrl} from './seoUrls.js';

/**
 * Server renderer for the unified browse page at /discover (#622), mirroring
 * renderPublicRecipe.tsx: the DS DiscoverPage (the public variant of the
 * unified RecipesPage, #547) renders inside the Express process with
 * react-dom/server, fed by the server's own data access (loadPublicDiscover) —
 * no internal HTTP hop. The shared Tamagui/Voice setup lives in
 * renderServerPage.tsx.
 *
 * The page declares its own canonical URL (React hoists the link into the
 * document head) so crawlers resolve /discover as the canonical browse address.
 * Production loads this module through the bundled SSR runtime
 * (scripts/buildSsrBundle.mjs → dist-ssr/renderDiscover.mjs, wired in
 * attachSsrRoutes).
 */
export const renderDiscoverStream = (
  recipes: PublicRecipeDiscoveryItem[],
  options: RenderToPipeableStreamOptions,
): PipeableStream =>
  renderServerPageStream(
    <>
      <link
        rel="canonical"
        href={new URL('/discover', getWebAppBaseUrl()).toString()}
      />
      <DiscoverPage {...buildDiscoverPageProps(recipes)} />
    </>,
    options,
  );

/**
 * Deterministic variant for the serving path — see renderServerPage.tsx for the
 * Tamagui CSS registry warm-up rationale.
 */
export const renderDiscoverStreamDeterministic = (
  recipes: PublicRecipeDiscoveryItem[],
  options: RenderToPipeableStreamOptions,
): Promise<PipeableStream> =>
  renderDeterministically(
    renderOptions => renderDiscoverStream(recipes, renderOptions),
    options,
  );
