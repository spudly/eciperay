/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  displayName: 'root',
  testEnvironment: 'node',
  roots: ['<rootDir>/scripts', '<rootDir>/eslint-rules', '<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.test.cjs'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.cjs'],
  resetMocks: true,
  injectGlobals: true,
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'scripts/**/*.ts',
    'eslint-rules/**/*.ts',
    'test/**/*.{ts,cjs}',
    '!**/*.test.ts',
    '!**/*.test.cjs',
    '!**/*.config.{ts,cjs,js,mjs}',
    '!test/jest.setup.cjs',
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
