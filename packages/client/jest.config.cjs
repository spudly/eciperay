/** @type {import('ts-jest').JestConfigWithTsJest} */
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
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@eciperay/types$': '<rootDir>/../types/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
          module: 'NodeNext',
          moduleResolution: 'nodenext',
        },
      },
    ],
  },
};
