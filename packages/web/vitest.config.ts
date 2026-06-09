import path from 'node:path';
import {fileURLToPath} from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    server: {deps: {inline: [/@tanstack/, /@recipoo/]}},
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/lib/env.ts', 'src/vite-env.d.ts'],
      thresholds: {lines: 100, functions: 100, branches: 100, statements: 100},
    },
  },
});
