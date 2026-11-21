import {Writable} from 'node:stream';
import type {ReactNode} from 'react';

import {createTamaguiConfig, eciperayTheme, VoiceProvider} from '@spudly/ui';
// TamaguiProvider comes from @tamagui/core directly: the 'tamagui'
// package re-exports it through an extensionless path that this
// package's NodeNext module resolution cannot follow (the web
// package's bundler resolution can, which is why the web entry
// imports it from 'tamagui').
import {TamaguiProvider} from '@tamagui/core';
import type {
  PipeableStream,
  RenderToPipeableStreamOptions,
} from 'react-dom/server';
import {renderToPipeableStream} from 'react-dom/server';

import {eciperayVoice} from '../i18n/voice.js';

/**
 * Shared server-side rendering for DS pages rendered inside the Express process
 * with react-dom/server (public recipe, unified browse, …).
 *
 * The Tamagui setup mirrors the web entry (packages/web/src/main.tsx): the DS
 * config factory over the Eciperay theme, light default theme, wrapped in the
 * app's VoiceProvider so server-rendered copy resolves through the same voice
 * object as the client.
 *
 * The render returns the `PipeableStream` from `renderToPipeableStream`
 * directly: wrapping it in a promise would defeat the streaming renderer — the
 * caller pipes the stream into the HTTP response (on `onShellReady`) for
 * improved TTFB and server-side Suspense, passing its own render callbacks
 * through `options`.
 */
const serverTamaguiConfig = createTamaguiConfig(eciperayTheme);

export const renderServerPageStream = (
  page: ReactNode,
  options: RenderToPipeableStreamOptions,
): PipeableStream =>
  renderToPipeableStream(
    <VoiceProvider voice={eciperayVoice}>
      <TamaguiProvider
        config={serverTamaguiConfig}
        defaultTheme="light"
      >
        {page}
      </TamaguiProvider>
    </VoiceProvider>,
    options,
  );

type RenderStreamFn = (
  options: RenderToPipeableStreamOptions,
) => PipeableStream;

/**
 * Collect one render into a discarded sink. A render error rejects: a failed
 * warm-up must surface like a failed render, not leave the sheet half-saturated
 * behind a successful response.
 */
const collectRender = (render: RenderStreamFn): Promise<void> =>
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
    render({onError: reject, onShellError: reject}).pipe(sink);
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
 * The warm-up pass renders the same page once and discards the output,
 * registering exactly the rules that page needs; the returned stream's render
 * then snapshots a saturated registry and is byte-identical to any later render
 * of the same page in this process. The cost is one extra render per request
 * (~90 ms warm on the Phase 0 measurements) on routes whose responses carry a
 * public cache TTL.
 */
export const renderDeterministically = async (
  render: RenderStreamFn,
  options: RenderToPipeableStreamOptions,
): Promise<PipeableStream> => {
  await collectRender(render);
  return render(options);
};
