import type {PublicRecipeResponse} from '@eciperay/types';
import {createTamaguiConfig, eciperayTheme, PublicRecipePage} from '@spudly/ui';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
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
 */
const serverTamaguiConfig = createTamaguiConfig(eciperayTheme);

export const renderPublicRecipeHtml = (body: PublicRecipeResponse): string =>
  renderToString(
    createElement(
      TamaguiProvider,
      {config: serverTamaguiConfig, defaultTheme: 'light'},
      createElement(PublicRecipePage, buildPublicRecipePageProps(body)),
    ),
  );
