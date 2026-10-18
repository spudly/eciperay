/** @type {import('jest').Config} */
module.exports = {
  displayName: 'client',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.setupAfterEnv.cjs'],
  resetMocks: true,
  injectGlobals: true,
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.test.ts',
    '!**/*.test.tsx',
    '!**/*.d.ts',
    '!src/index.ts',
    '!src/test/**',
    '!src/ui/**',
    '!src/dev/showcaseFixtures.ts', // showcase mock factories for dev previews
    '!src/dev/showcaseComponent.ts', // showcase demo types and id helper
  ],
  coverageThreshold: {
    global: {branches: 100, functions: 100, lines: 100, statements: 100},
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@eciperay/types$': '<rootDir>/../types/src/index.ts',
  },
  transform: {
    // @swc/jest (transpile-only) replaces ts-jest: ts-jest needs the
    // TypeScript JS compiler API, which native TypeScript 7 no longer
    // exposes, and its peer range blocks npm ci under TS7. Type safety
    // is enforced by `npm run typecheck`, not the test transform.
    // Mirrors packages/server's @swc/jest setup; .ts and .tsx get
    // separate parser settings so generics in .ts are not read as JSX.
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: {syntax: 'typescript', tsx: false, decorators: false},
          transform: {react: {runtime: 'automatic'}},
          target: 'es2022',
        },
        module: {type: 'es6'},
      },
    ],
    '^.+\\.tsx$': [
      '@swc/jest',
      {
        jsc: {
          parser: {syntax: 'typescript', tsx: true, decorators: false},
          transform: {react: {runtime: 'automatic'}},
          target: 'es2022',
        },
        module: {type: 'es6'},
      },
    ],
  },
};
