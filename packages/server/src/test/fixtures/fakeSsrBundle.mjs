// Test stand-in for the bundled SSR runtime entry (dist-ssr/
// renderPublicRecipe.mjs, built by scripts/buildSsrBundle.mjs): same export
// shape, minimal render so attachSsrRoutes tests can prove the bundle path
// is loaded when SSR_RENDERER_BUNDLE_PATH names it.
import {createElement} from 'react';
import {renderToPipeableStream} from 'react-dom/server';

export const renderPublicRecipeStreamDeterministic = (body, options) =>
  Promise.resolve(
    renderToPipeableStream(
      createElement('h1', null, `Bundled: ${body.recipe.title}`),
      options,
    ),
  );
