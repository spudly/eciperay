import path from 'node:path';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {configDefaults, defineConfig} from 'vitest/config';

const coverageGlobs = JSON.parse(
  readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      'coverageGlobs.json',
    ),
    'utf8',
  ),
) as {include: string[]; exclude: string[]};

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));
const monoRoot = path.resolve(pkgRoot, '../..');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '../..',
  resolve: {
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
    // Platform extensions, web first (the design system's web
    // Storybook makes the same choice): @spudly/ui 1.15's root graph
    // reaches react-native-svg, whose package ships .web.js variants
    // of its entry modules; resolving those keeps the native fabric
    // codegen specs — which import APIs react-native-web does not
    // export — out of the web module graph.
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
    ],
    alias: [
      // react-native-svg's sound module is native-only and breaks
      // web resolution (TurboModuleRegistry is not exported by
      // react-native-web) — see svgSoundModuleStub.ts. This entry
      // must precede the react-native alias below.
      {
        find: /^.*NativeSvgSoundModule(\.js)?$/,
        replacement: path.join(pkgRoot, 'svgSoundModuleStub.ts'),
      },
      // Same react-native substitution as vite.config.ts: design system
      // page components (@spudly/ui/pages) render React Native
      // primitives, resolved to react-native-web in web contexts.
      {find: /^react-native$/, replacement: 'react-native-web'},
      // @spudly/ui 1.15's Icon base imports react-native-svg. Its
      // CommonJS entry runtime-requires react-native (unparseable
      // Flow syntax in Node, and unreachable by the alias above), so
      // resolve the package to its ESM entry, whose module graph
      // Vite processes — and aliases — end to end.
      {
        find: /^react-native-svg$/,
        replacement: 'react-native-svg/lib/module/index.js',
      },
      {
        find: '@eciperay/client',
        replacement: path.join(monoRoot, 'packages/client/src/index.ts'),
      },
      {
        find: '@eciperay/types',
        replacement: path.join(monoRoot, 'packages/types/src/index.ts'),
      },
      // Wrap @testing-library/react's render in TamaguiProvider: the ui
      // primitives are now @spudly/ui (Tamagui) adapters that need a theme.
      {
        find: '@testing-library/react',
        replacement: path.join(pkgRoot, 'src/test/rtlWithTheme.tsx'),
      },
    ],
  },
  test: {
    // Playwright specs live in e2e/ and e2e-live/ and run under
    // `playwright test` (npm run test:e2e / test:e2e:live), never under
    // Vitest — its default include pattern would otherwise collect
    // them and fail.
    exclude: [...configDefaults.exclude, 'e2e/**', 'e2e-live/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    server: {
      deps: {
        // @spudly/ui/pages imports react-native; inlining keeps its
        // module graph inside Vite's pipeline so the react-native ->
        // react-native-web alias above applies (externalized, Node would
        // resolve the real react-native package and fail to parse it).
        inline: [
          /@tanstack/,
          /@eciperay/,
          /@dnd-kit/,
          /@spudly/,
          /react-native-web/,
          // @spudly/ui 1.15's root graph reaches react-native-svg
          // (its Icon base, via the accordion/disclosure icons);
          // externalized it loads natively and pulls the real
          // react-native package, which Node cannot parse — the
          // same failure the comment above describes.
          /react-native-svg/,
        ],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: coverageGlobs.include,
      exclude: coverageGlobs.exclude,
      thresholds: {lines: 100, functions: 100, branches: 100, statements: 100},
    },
  },
});
