import path from 'node:path';
import {fileURLToPath} from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';

import {createApiProxy} from './viteProxy.js';

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));
const monoRoot = path.resolve(pkgRoot, '../..');

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, monoRoot, '');
  const port = Number(env['VITE_PORT'] ?? 8081);
  const apiPort = env['PORT'] ?? '8080';
  const apiTarget = `http://localhost:${apiPort}`;

  return {
    plugins: [react(), tailwindcss()],
    envDir: '../..',
    server: {
      port,
      proxy: {
        '/auth': createApiProxy(apiTarget),
        '/recipes': createApiProxy(apiTarget),
        '/tags': createApiProxy(apiTarget),
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom', '@tanstack/react-query'],
      alias: {
        'react': path.join(pkgRoot, 'node_modules/react'),
        'react-dom': path.join(pkgRoot, 'node_modules/react-dom'),
        '@recipoo/client': path.join(monoRoot, 'packages/client/src/index.ts'),
        '@recipoo/types': path.join(monoRoot, 'packages/types/src/index.ts'),
      },
    },
  };
});
