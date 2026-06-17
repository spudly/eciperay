import path from 'node:path';
import {fileURLToPath} from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';

import {createApiProxy} from './viteProxy.js';

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));
const monoRoot = path.resolve(pkgRoot, '../..');

const esbuildDestructuringSupport = {
  supported: {
    // esbuild 0.28+ errors when lowering destructuring for Vite's default
    // browser targets; our minimums are modern enough to run it natively.
    destructuring: true,
  },
} as const;

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, monoRoot, '');
  const port = Number(env['VITE_PORT'] ?? 8081);
  const apiPort = env['PORT'] ?? '8080';
  const apiTarget = `http://localhost:${apiPort}`;

  return {
    plugins: [react(), tailwindcss()],
    envDir: '../..',
    esbuild: esbuildDestructuringSupport,
    optimizeDeps: {esbuildOptions: esbuildDestructuringSupport},
    server: {port, proxy: {'/api': createApiProxy(apiTarget)}},
    resolve: {
      dedupe: ['react', 'react-dom', '@tanstack/react-query'],
      alias: {
        'react': path.join(pkgRoot, 'node_modules/react'),
        'react-dom': path.join(pkgRoot, 'node_modules/react-dom'),
        '@eciperay/client': path.join(monoRoot, 'packages/client/src/index.ts'),
        '@eciperay/types': path.join(monoRoot, 'packages/types/src/index.ts'),
      },
    },
  };
});
