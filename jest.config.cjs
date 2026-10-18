/** @type {import('jest').Config} */
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
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {'^(\\.{1,2}/.*)\\.js$': '$1'},
  transform: {
    // @swc/jest (transpile-only) replaces ts-jest: ts-jest needs the
    // TypeScript JS compiler API, which native TypeScript 7 no longer
    // exposes, and its peer range blocks npm ci under TS7. Type safety
    // is enforced by `npm run typecheck`, not the test transform.
    // Mirrors packages/server's @swc/jest setup.
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
