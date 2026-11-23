import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {RecipesPage} from '@spudly/ui';
import type {
  PipeableStream,
  RenderToPipeableStreamOptions,
} from 'react-dom/server';

import {buildRecipesPageProps} from './buildRecipesPageProps.js';
import {
  renderDeterministically,
  renderServerPageStream,
} from './renderServerPage.js';
import {getWebAppBaseUrl} from './seoUrls.js';

/**
 * Server renderer for the unified browse page at /recipes (#622), mirroring
 * renderPublicRecipe.tsx: the DS RecipesPage in its public variant (#547)
 * renders inside the Express process with react-dom/server, fed by the server's
 * own data access (loadPublicRecipes) — no internal HTTP hop. The shared
 * Tamagui/Voice setup lives in renderServerPage.tsx.
 *
 * The page declares its own canonical URL (React hoists the link into the
 * document head) so crawlers resolve /recipes as the canonical browse address.
 * Production loads this module through the bundled SSR runtime
 * (scripts/buildSsrBundle.mjs → dist-ssr/renderRecipes.mjs, wired in
 * attachSsrRoutes).
 */
export const renderRecipesStream = (
  recipes: PublicRecipeDiscoveryItem[],
  options: RenderToPipeableStreamOptions,
): PipeableStream =>
  renderServerPageStream(
    <>
      <link
        rel="canonical"
        href={new URL('/recipes', getWebAppBaseUrl()).toString()}
      />
      <RecipesPage {...buildRecipesPageProps(recipes)} />
    </>,
    options,
  );

/**
 * Deterministic variant for the serving path — see renderServerPage.tsx for the
 * Tamagui CSS registry warm-up rationale.
 */
export const renderRecipesStreamDeterministic = (
  recipes: PublicRecipeDiscoveryItem[],
  options: RenderToPipeableStreamOptions,
): Promise<PipeableStream> =>
  renderDeterministically(
    renderOptions => renderRecipesStream(recipes, renderOptions),
    options,
  );
