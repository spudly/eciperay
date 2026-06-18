const path = require('node:path');

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {
  patchMetroSourceMapStringForPackedMaps,
} = require('@expo/metro-config/build/serializer/sourceMap');
const {withNativewind} = require('nativewind/metro');
const {resolve: metroResolve} = require('metro-resolver');

const {writeEnvShim} = require('./scripts/envShim.cjs');

// NativeWind uses @expo/metro-config's transformer, which stores packed source maps
// instead of Babel tuple arrays. Metro's standalone .map endpoint (used by DevTools)
// must be patched to understand that format.
patchMetroSourceMapStringForPackedMaps();

const projectRoot = __dirname; // packages/app/
const monorepoRoot = path.resolve(projectRoot, '../..'); // repo root

// Bake only mobile client env into env-shim.js for @env imports at bundle time.
writeEnvShim({
  monorepoRoot,
  outputPath: path.resolve(projectRoot, 'env-shim.js'),
});

const resolveTypeScriptEsmImport = (context, moduleName, platform) => {
  try {
    return metroResolve(context, moduleName, platform);
  } catch (error) {
    if (
      moduleName.endsWith('.js') &&
      (moduleName.startsWith('./') || moduleName.startsWith('../'))
    ) {
      return metroResolve(context, moduleName.slice(0, -3), platform);
    }
    throw error;
  }
};

const appReact = path.resolve(monorepoRoot, 'node_modules/react');

const config = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // Prevent Metro from resolving react from packages/client/node_modules (duplicate copy).
    disableHierarchicalLookup: true,
    extraNodeModules: {
      '@env': path.resolve(projectRoot, 'env-shim.js'),
      'react': appReact,
    },
    // @eciperay/client uses NodeNext ESM imports (e.g. ./AuthProvider.js → AuthProvider.tsx).
    resolveRequest: resolveTypeScriptEsmImport,
  },
});

module.exports = withNativewind(config);
