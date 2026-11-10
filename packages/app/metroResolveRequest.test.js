/* global __dirname -- CJS test file: __dirname is a Node runtime global that the jest eslint env does not declare */
const fs = require('node:fs');
const path = require('node:path');

const {resolveRequest} = require('./metroResolveRequest.cjs');

const appRoot = __dirname; // packages/app/
const monorepoRoot = path.resolve(appRoot, '../..');

// A minimal Metro resolution context with the same shape the app config
// produces (app-first nodeModulesPaths + disableHierarchicalLookup), so
// the test exercises metro-resolver exactly as Metro does at bundle time.
const getPackageForModule = modulePath => {
  let dir =
    fs.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()
      ? modulePath
      : path.dirname(modulePath);
  for (;;) {
    const packageJsonPath = path.join(dir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return {
        rootPath: dir,
        packageJson: JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')),
        packageRelativePath: path.relative(dir, modulePath),
      };
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
};

const fileSystemLookup = candidate => {
  try {
    const stat = fs.statSync(candidate);
    return {
      exists: true,
      type: stat.isDirectory() ? 'd' : 'f',
      realPath: fs.realpathSync(candidate),
    };
  } catch {
    return {exists: false, type: null, realPath: candidate};
  }
};

const makeContext = originModulePath => ({
  allowHaste: false,
  assetExts: new Set(['png']),
  blockList: /(?<!.*)$/,
  disableHierarchicalLookup: true,
  doesFileExist: candidate =>
    fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  extraNodeModules: {},
  isESMImport: false,
  mainFields: ['react-native', 'browser', 'main'],
  nodeModulesPaths: [
    path.resolve(appRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],
  originModulePath,
  preferNativePlatform: true,
  redirectModulePath: candidate => candidate,
  resolveAsset: () => null,
  resolveRequest: null,
  sourceExts: new Set(['js', 'jsx', 'json', 'ts', 'tsx']),
  unstable_conditionNames: ['require', 'react-native'],
  unstable_conditionsByPlatform: {ios: [], android: [], web: []},
  unstable_enablePackageExports: true,
  customResolverOptions: {},
  getPackageForModule,
  fileSystemLookup,
  unstable_logWarning: () => {},
  resolveHasteModule: () => null,
  resolveHastePackage: () => null,
  getPackage: () => null,
});

const zodVersionAt = filePath => {
  const zodDir = filePath.slice(0, filePath.lastIndexOf('zod') + 3);
  return JSON.parse(fs.readFileSync(path.join(zodDir, 'package.json'), 'utf8'))
    .version;
};

describe('metroResolveRequest zod resolution', () => {
  test('resolves zod to the monorepo-root zod 4 copy for client files', () => {
    const origin = path.join(monorepoRoot, 'packages/client/src/authEmail.ts');
    const result = resolveRequest(makeContext(origin), 'zod', 'ios');
    expect(result.type).toBe('sourceFile');
    expect(zodVersionAt(result.filePath)).toMatch(/^4\./);
  });

  test('does not apply the override to sibling prefixes of the client root', () => {
    const origin = path.join(monorepoRoot, 'packages/client-foo/src/index.ts');
    const result = resolveRequest(makeContext(origin), 'zod', 'ios');
    expect(result.type).toBe('sourceFile');
    expect(zodVersionAt(result.filePath)).toMatch(/^3\./);
  });

  test('keeps the app-local zod 3 copy for non-client files', () => {
    const origin = path.join(appRoot, 'node_modules/expo/src/index.ts');
    const result = resolveRequest(makeContext(origin), 'zod', 'ios');
    expect(result.type).toBe('sourceFile');
    expect(zodVersionAt(result.filePath)).toMatch(/^3\./);
  });
});
