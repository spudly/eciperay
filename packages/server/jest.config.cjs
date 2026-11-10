/** @type {import('jest').Config} */
const os = require('node:os');

module.exports = {
  displayName: 'server',
  // Cap local workers at 2 (never above Jest's own cores-1 sizing): the
  // default pool oversubscribes small shared-vCPU machines. On CI the key
  // is omitted entirely, leaving Jest's default (cores - 1) untouched.
  ...(process.env.CI
    ? {}
    : {maxWorkers: Math.max(1, Math.min(2, os.availableParallelism() - 1))}),
  testEnvironment: 'node',
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
    '^@eciperay/types$': '<rootDir>/../types/src/index.ts',
    '^@eciperay/client/sanitizeAnalyticsProperties$':
      '<rootDir>/../client/src/sanitizeAnalyticsProperties.ts',
  },
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: {syntax: 'typescript', decorators: false},
          target: 'es2022',
        },
        module: {type: 'es6'},
      },
    ],
  },
};
