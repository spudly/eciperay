/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  displayName: 'server',
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
  coverageThreshold: {
    global: {branches: 100, functions: 100, lines: 100, statements: 100},
  },
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@eciperay/types$': '<rootDir>/../types/src/index.ts',
    '^@eciperay/client/sanitizeAnalyticsProperties$':
      '<rootDir>/../client/src/sanitizeAnalyticsProperties.ts',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {module: 'NodeNext', moduleResolution: 'nodenext'},
      },
    ],
  },
};
