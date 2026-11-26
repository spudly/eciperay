/** @type {import('jest').Config} */
const os = require('node:os');

module.exports = {
  displayName: 'client',
  // Cap local workers at 2 (never above Jest's own cores-1 sizing): the
  // default pool oversubscribes small shared-vCPU machines. On CI the key
  // is omitted entirely, leaving Jest's default (cores - 1) untouched.
  // The CI check compares against the literal 'true': a truthy CI='false'
  // must still count as a local run and keep the cap.
  ...(process.env.CI === 'true'
    ? {}
    : {maxWorkers: Math.max(1, Math.min(2, os.availableParallelism() - 1))}),
  testEnvironment: 'jsdom',
  // Web-first platform extensions, mirroring the server package's jest
  // config: the react-native-svg graph ships .web.js variants that avoid
  // the native fabric codegen specs react-native-web does not export.
  moduleFileExtensions: ['web.js', 'ts', 'tsx', 'js', 'mjs', 'json', 'node'],
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
    // #673: the moved-in modules (tagColors, tamaguiConfig) import
    // @spudly/ui at runtime, whose module graph reaches react-native;
    // in Node the web substitution applies, exactly as the server
    // package's jest config maps it for its SSR graph (#304).
    '^react-native$': 'react-native-web',
    '^react-native-svg$': 'react-native-svg/lib/module/index.js',
    'NativeSvgSoundModule(\\.js)?$': '<rootDir>/src/test/svgSoundModuleStub.ts',
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
    // Plain .js/.mjs files only arrive from the transformed node_modules
    // packages below (@spudly/ui, Tamagui, react-native-web/-svg ship
    // untranspiled ESM); src/ itself is all TypeScript.
    '^.+\\.m?js$': [
      '@swc/jest',
      {
        jsc: {
          parser: {syntax: 'ecmascript', jsx: true, importMeta: true},
          transform: {react: {runtime: 'automatic'}},
          target: 'es2022',
        },
        module: {type: 'es6'},
      },
    ],
  },
  // #673: the @spudly/ui module graph (react-native-web, react-native-svg,
  // Tamagui) ships untranspiled ESM that plain Node cannot load; transpile
  // those packages like the server package's jest config does (#304).
  transformIgnorePatterns: [
    '/node_modules/(?!(@spudly|@tamagui|tamagui|react-native-web|react-native-svg|@react-native)/)',
  ],
};
