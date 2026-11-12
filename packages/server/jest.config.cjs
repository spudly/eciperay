/** @type {import('jest').Config} */
const os = require('node:os');

module.exports = {
  displayName: 'server',
  // Cap local workers at 2 (never above Jest's own cores-1 sizing): the
  // default pool oversubscribes small shared-vCPU machines. On CI the key
  // is omitted entirely, leaving Jest's default (cores - 1) untouched.
  // The CI check compares against the literal 'true': a truthy CI='false'
  // must still count as a local run and keep the cap.
  ...(process.env.CI === 'true'
    ? {}
    : {maxWorkers: Math.max(1, Math.min(2, os.availableParallelism() - 1))}),
  testEnvironment: 'node',
  // Web-first platform extensions, mirroring the web Vite build: the
  // react-native-svg graph ships .web.js variants that avoid the
  // native fabric codegen specs react-native-web does not export.
  moduleFileExtensions: ['web.js', 'ts', 'tsx', 'js', 'mjs', 'json', 'node'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setupEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  resetMocks: true,
  injectGlobals: true,
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/*.test.ts',
    '!**/test/**',
    '!src/loadEnv.ts', // env setup side-effect only
    '!src/db/migrate.ts', // CLI script, DB-dependent
    '!src/db/pool.ts', // pg.Pool constructor only
    '!src/db/query.ts', // thin pg.Pool.query wrapper; tested via the pg library itself
  ],
  ...(process.env.JEST_SHARD_INDEX
    ? {}
    : {
        coverageThreshold: {
          global: {branches: 100, functions: 100, lines: 100, statements: 100},
        },
      }),
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // #304 SSR spike: @spudly/ui page components import react-native;
    // in Node the web substitution applies, exactly as the web Vite
    // build aliases it (packages/web/vite.config.ts).
    '^react-native$': 'react-native-web',
    '^react-native-svg$': 'react-native-svg/lib/module/index.js',
    'NativeSvgSoundModule(\\.js)?$': '<rootDir>/src/test/svgSoundModuleStub.ts',
    '^@eciperay/types$': '<rootDir>/../types/src/index.ts',
    '^@eciperay/client/sanitizeAnalyticsProperties$':
      '<rootDir>/../client/src/sanitizeAnalyticsProperties.ts',
  },
  transform: {
    '^.+\\.[tj]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: {syntax: 'typescript', tsx: true, decorators: false},
          target: 'es2022',
        },
        module: {type: 'es6'},
      },
    ],
  },
  // #304 SSR spike: the @spudly/ui module graph (react-native-web,
  // react-native-svg, Tamagui) ships untranspiled ESM that plain Node
  // cannot load; transpile those packages like the web build does.
  transformIgnorePatterns: [
    '/node_modules/(?!(@spudly|@tamagui|tamagui|react-native-web|react-native-svg|@react-native)/)',
  ],
};
