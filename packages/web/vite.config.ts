import path from 'node:path';
import {fileURLToPath} from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));
const monoRoot = path.resolve(pkgRoot, '../..');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '../..',
  resolve: {
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
    alias: {
      'react': path.join(pkgRoot, 'node_modules/react'),
      'react-dom': path.join(pkgRoot, 'node_modules/react-dom'),
      '@recipoo/client': path.join(monoRoot, 'packages/client/src/index.ts'),
      '@recipoo/types': path.join(monoRoot, 'packages/types/src/index.ts'),
    },
  },
  server: {port: 8081},
});
