const path = require('node:path');

const {resolve: metroResolve} = require('metro-resolver');

const projectRoot = __dirname; // packages/app/
const monorepoRoot = path.resolve(projectRoot, '../..'); // repo root
const clientRoot = path.resolve(monorepoRoot, 'packages/client');

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

const resolveRequest = (context, moduleName, platform) => {
  // @eciperay/client declares zod ^4 and uses the Zod 4 top-level formats
  // (z.email). With disableHierarchicalLookup and the app-first
  // nodeModulesPaths in metro.config.cjs, a bare `zod` import from client
  // files would resolve to the app-local zod 3 copy (an Expo transitive
  // dependency), which has no z.email — so resolve `zod` from the
  // monorepo root (the client's declared copy) when the importer is a
  // client file. Every other package keeps the default resolution and
  // its own zod copy.
  if (
    moduleName === 'zod' &&
    context.originModulePath.startsWith(clientRoot + path.sep)
  ) {
    return metroResolve(
      {
        ...context,
        nodeModulesPaths: [path.resolve(monorepoRoot, 'node_modules')],
      },
      moduleName,
      platform,
    );
  }
  // @eciperay/client uses NodeNext ESM imports (e.g. ./AuthProvider.js → AuthProvider.tsx).
  return resolveTypeScriptEsmImport(context, moduleName, platform);
};

module.exports = {resolveRequest};
