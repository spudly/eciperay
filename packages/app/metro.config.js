const path = require('node:path');
const fs = require('node:fs');

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withNativewind} = require('nativewind/metro');
const dotenv = require('dotenv');

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

const config = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    extraNodeModules: {'@env': path.resolve(projectRoot, 'env-shim.js')},
  },
});

module.exports = withNativewind(config);
