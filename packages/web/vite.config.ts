import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import posthog from '@posthog/rollup-plugin';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';

import {createApiProxy} from './viteProxy.js';

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));
const monoRoot = path.resolve(pkgRoot, '../..');

const webPackageJson = JSON.parse(
  readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'),
) as {version?: string};
const appVersion = webPackageJson.version ?? 'unknown';

// Vite 8 transforms with Oxc (via Rolldown), which has no per-feature
// `supported` map like esbuild's: syntax lowering is governed solely by
// the transform target, and 'esnext' performs no lowering at all. That
// preserves the intent of the old esbuild
// `supported: { destructuring: true }` flag — esbuild 0.28+ errors when
// lowering destructuring for Vite's default browser targets, and our
// minimums run modern syntax natively — so destructuring (and every
// other modern feature) stays native instead of being lowered. (#195)
const noLoweringTarget = 'esnext' as const;

const createPostHogSourceMapPlugin = (mode: string) => {
  if (mode !== 'production') {
    return null;
  }
  const apiKey = process.env['POSTHOG_API_KEY'];
  const projectId = process.env['POSTHOG_PROJECT_ID'];
  if (!apiKey || !projectId) {
    return null;
  }
  return posthog({
    personalApiKey: apiKey,
    projectId,
    host: process.env['POSTHOG_API_HOST'] ?? 'https://us.posthog.com',
    sourcemaps: {
      enabled: true,
      releaseName: 'eciperay-web',
      releaseVersion:
        process.env['GITHUB_SHA'] ??
        process.env['npm_package_version'] ??
        'unknown',
      deleteAfterUpload: true,
    },
  });
};

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, monoRoot, '');
  const port = Number(env['VITE_PORT'] ?? 8081);
  const apiPort = env['PORT'] ?? '8080';
  const apiTarget = `http://localhost:${apiPort}`;
  const posthogPlugin = createPostHogSourceMapPlugin(mode);

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(posthogPlugin ? [posthogPlugin] : []),
    ],
    define: {
      // Tamagui and its dependencies reference process.env at runtime.
      // Vite does not polyfill process by default, so provide a minimal stub.
      'process.env': {},
      // The web package version (kept in sync across the monorepo) is the
      // app version attached to analytics context such as feedback events.
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
    envDir: '../..',
    oxc: {target: noLoweringTarget},
    optimizeDeps: {rolldownOptions: {transform: {target: noLoweringTarget}}},
    build: {sourcemap: mode === 'production'},
    server: {port, proxy: {'/api': createApiProxy(apiTarget)}},
    resolve: {
      dedupe: ['react', 'react-dom', '@tanstack/react-query'],
      alias: [
        // Design system page components (@spudly/ui/pages) render React
        // Native primitives such as FlatList; the web build resolves
        // react-native to react-native-web, the same substitution the
        // design system's web Storybook makes. Exact-name alias only:
        // subpath imports (react-native/...) are not used and must not
        // be rewritten.
        {find: /^react-native$/, replacement: 'react-native-web'},
        {
          find: '@eciperay/client',
          replacement: path.join(monoRoot, 'packages/client/src/index.ts'),
        },
        {
          find: '@eciperay/types',
          replacement: path.join(monoRoot, 'packages/types/src/index.ts'),
        },
      ],
    },
  };
});
