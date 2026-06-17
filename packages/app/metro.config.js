const path = require('node:path');
const fs = require('node:fs');

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {
  patchMetroSourceMapStringForPackedMaps,
} = require('@expo/metro-config/build/serializer/sourceMap');
const {withNativewind} = require('nativewind/metro');
const {resolve: metroResolve} = require('metro-resolver');
const dotenv = require('dotenv');

// NativeWind uses @expo/metro-config's transformer, which stores packed source maps
// instead of Babel tuple arrays. Metro's standalone .map endpoint (used by DevTools)
// must be patched to understand that format.
patchMetroSourceMapStringForPackedMaps();

const projectRoot = __dirname; // packages/app/
const monorepoRoot = path.resolve(projectRoot, '../..'); // repo root

// Read the root .env and generate env-shim.js with real values so Metro can
// resolve @env imports at bundle time (no Babel transform needed).
const {parsed: envVars = {}} = dotenv.config({
  path: path.resolve(monorepoRoot, '.env'),
});
const shimLines = Object.entries(envVars).map(
  ([key, val]) => `exports.${key} = ${JSON.stringify(val)};`,
);
fs.writeFileSync(
  path.resolve(projectRoot, 'env-shim.js'),
  `${shimLines.join('\n')}\n`,
);

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
