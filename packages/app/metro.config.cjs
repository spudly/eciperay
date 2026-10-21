const path = require('node:path');

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {
  withExpoSerializers,
} = require('@expo/metro-config/build/serializer/withExpoSerializers');
const {resolve: metroResolve} = require('metro-resolver');
const {
  unstableBeforeAssetSerializationDebugIdPlugin,
} = require('posthog-react-native/metro');

const {writeEnvShim} = require('./scripts/envShim.cjs');

// The exported config is wrapped in withExpoSerializers (bottom of this
// file): the default React Native serializer never executes
// serializer.unstable_beforeAssetSerializationPlugins, which is the hook the
// PostHog plugin (below) uses to inject the debug ID that links bundles to
// their source maps — without the Expo serializer the plugin is silently
// inert. (@expo/metro-config 58 removed the packed source-map format and
// the patchMetroSourceMapStringForPackedMaps patch that Metro's standalone
// .map endpoint needed to read it; the 58 serializer emits standard source
// maps, so no patch is required.)

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

module.exports = withExpoSerializers({
  ...config,
  serializer: {
    ...config.serializer,
    unstable_beforeAssetSerializationPlugins: [
      ...(config.serializer?.unstable_beforeAssetSerializationPlugins ?? []),
      unstableBeforeAssetSerializationDebugIdPlugin,
    ],
  },
});
