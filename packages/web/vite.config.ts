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

const esbuildDestructuringSupport = {
  supported: {
    // esbuild 0.28+ errors when lowering destructuring for Vite's default
    // browser targets; our minimums are modern enough to run it natively.
    destructuring: true,
  },
} as const;

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
    esbuild: esbuildDestructuringSupport,
    optimizeDeps: {esbuildOptions: esbuildDestructuringSupport},
    build: {sourcemap: mode === 'production'},
    server: {port, proxy: {'/api': createApiProxy(apiTarget)}},
    resolve: {
      dedupe: ['react', 'react-dom', '@tanstack/react-query'],
      alias: {
        '@eciperay/client': path.join(monoRoot, 'packages/client/src/index.ts'),
        '@eciperay/types': path.join(monoRoot, 'packages/types/src/index.ts'),
      },
    },
  };
});
