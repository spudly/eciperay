// Build the bundled SSR runtime entry for #304.
//
// The public-recipe renderer (src/lib/renderPublicRecipe.tsx) pulls in the
// @spudly/ui module graph, which ships untranspiled ESM that plain Node
// cannot load: DS pages import `react-native`, and react-native-svg's ESM
// assumes bundler resolution (its fabric specs call codegenNativeComponent,
// which react-native-web does not export — the .web.js variants avoid them).
// The Jest pipeline applies the web substitutions and transpiles the graph
// (see jest.config.cjs); production has no such pipeline, so the renderer is
// bundled ahead of time with the same substitutions and the server loads the
// resulting self-contained ESM file with bare Node (see attachSsrRoutes).
//
// Usage: node scripts/buildSsrBundle.mjs
// Output: packages/server/dist-ssr/renderPublicRecipe.mjs
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {build} from 'esbuild';

const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

// Mirror of the jest.config.cjs substitution for react-native-svg's
// native-only sound module: it calls TurboModuleRegistry at import time,
// which react-native-web does not export, and no DS component uses it.
const svgSoundModuleStub = {
  name: 'svg-sound-module-stub',
  setup(pluginBuild) {
    pluginBuild.onResolve({filter: /NativeSvgSoundModule(\.js)?$/}, () => ({
      path: path.join(serverRoot, 'src/test/svgSoundModuleStub.ts'),
    }));
  },
};

await build({
  entryPoints: [path.join(serverRoot, 'src/lib/renderPublicRecipe.tsx')],
  outfile: path.join(serverRoot, 'dist-ssr/renderPublicRecipe.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  jsx: 'automatic',
  // Web-first resolution, mirroring jest.config.cjs moduleFileExtensions and
  // the web Vite build: .web variants avoid the native fabric codegen specs.
  resolveExtensions: [
    '.web.js',
    '.web.ts',
    '.web.tsx',
    '.ts',
    '.tsx',
    '.js',
    '.mjs',
    '.json',
  ],
  mainFields: ['module', 'main'],
  alias: {
    'react-native': 'react-native-web',
    'react-native-svg': 'react-native-svg/lib/module/index.js',
  },
  plugins: [svgSoundModuleStub],
  // Some bundled CommonJS dependencies call require() for Node builtins;
  // give the ESM output a real require.
  banner: {
    js: "import {createRequire as __ssrCreateRequire} from 'node:module'; const require = __ssrCreateRequire(import.meta.url);",
  },
  logLevel: 'info',
});
