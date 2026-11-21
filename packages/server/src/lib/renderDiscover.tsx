import {Writable} from 'node:stream';

import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {
  createTamaguiConfig,
  DiscoverPage,
  eciperayTheme,
  VoiceProvider,
} from '@spudly/ui';
import {TamaguiProvider} from '@tamagui/core';
import type {
  PipeableStream,
  RenderToPipeableStreamOptions,
} from 'react-dom/server';
import {renderToPipeableStream} from 'react-dom/server';

import {eciperayVoice} from '../i18n/voice.js';
import {buildDiscoverPageProps} from './buildDiscoverPageProps.js';
import {getWebAppBaseUrl} from './seoUrls.js';

/**
 * Server renderer for the unified browse page at /discover (#622), mirroring
 * renderPublicRecipe.tsx: the DS DiscoverPage (the public variant of the
 * unified RecipesPage, #547) renders inside the Express process with
 * react-dom/server, fed by the server's own data access (loadPublicDiscover) —
 * no internal HTTP hop. The Tamagui setup mirrors the web entry
 * (packages/web/src/main.tsx).
 *
 * The page declares its own canonical URL (React hoists the link into the
 * document head) so crawlers resolve /discover as the canonical browse address.
 * Production loads this module through the bundled SSR runtime
 * (scripts/buildSsrBundle.mjs → dist-ssr/renderDiscover.mjs, wired in
 * attachSsrRoutes).
 */
const serverTamaguiConfig = createTamaguiConfig(eciperayTheme);

export const renderDiscoverStream = (
  recipes: PublicRecipeDiscoveryItem[],
  options: RenderToPipeableStreamOptions,
): PipeableStream =>
  renderToPipeableStream(
    <VoiceProvider voice={eciperayVoice}>
      <TamaguiProvider
        config={serverTamaguiConfig}
        defaultTheme="light"
      >
        <link
          rel="canonical"
          href={new URL('/discover', getWebAppBaseUrl()).toString()}
        />
        <DiscoverPage {...buildDiscoverPageProps(recipes)} />
      </TamaguiProvider>
    </VoiceProvider>,
    options,
  );

const collectRender = (recipes: PublicRecipeDiscoveryItem[]): Promise<void> =>
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
    renderDiscoverStream(recipes, {onError: reject, onShellError: reject}).pipe(
      sink,
    );
  });

/**
 * Deterministic variant for the serving path — same Tamagui CSS registry
 * warm-up rationale as renderPublicRecipeStreamDeterministic: one discarded
 * render saturates the registry so the served render is byte-identical to later
 * renders of the same feed in this process.
 */
export const renderDiscoverStreamDeterministic = async (
  recipes: PublicRecipeDiscoveryItem[],
  options: RenderToPipeableStreamOptions,
): Promise<PipeableStream> => {
  await collectRender(recipes);
  return renderDiscoverStream(recipes, options);
};
