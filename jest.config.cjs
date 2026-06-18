/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  displayName: 'scripts',
  testEnvironment: 'node',
  roots: ['<rootDir>/scripts'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/scripts/jest.setup.cjs'],
  resetMocks: true,
  injectGlobals: true,
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'scripts/**/*.ts',
    '!**/*.test.ts',
    '!scripts/jest.setup.cjs',
  ],
  coverageThreshold: {
    global: {branches: 100, functions: 100, lines: 100, statements: 100},
  },
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
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
