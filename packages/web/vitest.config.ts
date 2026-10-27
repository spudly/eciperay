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
    alias: [
      // Same react-native substitution as vite.config.ts: design system
      // page components (@spudly/ui/pages) render React Native
      // primitives, resolved to react-native-web in web contexts.
      {find: /^react-native$/, replacement: 'react-native-web'},
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
    // Playwright specs live in e2e/ and run under `playwright test`
    // (npm run test:e2e), never under Vitest — its default include
    // pattern would otherwise collect them and fail.
    exclude: [...configDefaults.exclude, 'e2e/**'],
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
