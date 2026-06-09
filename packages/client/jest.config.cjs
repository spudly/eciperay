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
  ],
  coverageThreshold: {
    global: {branches: 100, functions: 100, lines: 100, statements: 100},
  },
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@recipoo/types$': '<rootDir>/../types/src/index.ts',
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
