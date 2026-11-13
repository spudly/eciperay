import {Writable} from 'node:stream';

import type {
  PipeableStream,
  RenderToPipeableStreamOptions,
} from 'react-dom/server';

type StreamRenderer = (
  options: RenderToPipeableStreamOptions,
) => PipeableStream;

/**
 * Test-only helper: collect a streaming render (`renderToPipeableStream`) into
 * a full HTML string so tests can assert on the complete document. Production
 * code never collects — it pipes the stream straight into the HTTP response
 * (see src/lib/renderPublicRecipe.tsx).
 *
 * A render error rejects instead of resolving with partial/fallback HTML: React
 * can recover from an error inside a Suspense boundary and finish with fallback
 * markup, so without the `onError: reject` wiring a failed page would silently
 * pass as its fallback. The render-error regression test fails if that wiring
 * is removed.
 */
export const renderStreamToHtml = (render: StreamRenderer): Promise<string> =>
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
    render({onError: reject, onShellError: reject}).pipe(output);
  });
