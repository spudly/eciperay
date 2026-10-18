module.exports = {
  preset: '@react-native/jest-preset',
  testTimeout: 15_000,
  setupFiles: ['<rootDir>/jest.env.js'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  // Teardown clears QueryClients, but React Native / TanStack Query can still
  // leave open handles after the suite finishes (local pre-commit and CI).
  forceExit: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    'env-shim.test.js', // env shim for moduleNameMapper; not a test suite
    'src/__tests__/fixtures/', // shared fixture helpers; not test suites
    'src/__tests__/testUtils.tsx', // shared test helpers; not a test suite
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts', // type declaration files only
    '!src/navigation/types.ts', // type aliases only, no runtime code
    '!src/lib/env.ts', // typeof branch unreachable when shim always provides a string
    '!src/lib/supabase.ts', // createSupabaseClient wrapper; tested via supabase.test.ts
    '!src/navigation/*.tsx', // React Navigation setup; no business logic to unit-test
    '!src/navigation/getComponentShowcaseScreen.ts', // dev-only dynamic require
    '!src/screens/ComponentShowcaseScreen.tsx', // dev-only showcase entry
    '!src/components/**', // mirrored components; covered by screen/view tests and co-located demos
    '!src/__tests__/testUtils.tsx', // shared render/query helpers; not app code
  ],
  coverageThreshold: {
    global: {branches: 100, functions: 100, lines: 100, statements: 100},
  },
  moduleNameMapper: {
    '^@env$': '<rootDir>/env-shim.test.js',
    '^@eciperay/client$': '<rootDir>/../client/src/index.ts',
    '^react$': '<rootDir>/node_modules/react',
    '^react-test-renderer$': '<rootDir>/node_modules/react-test-renderer',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-async-storage|@react-navigation|react-native-reanimated|react-native-worklets|react-native-safe-area-context|react-native-screens|react-native-blob-util|react-native-gesture-handler|react-native-draggable-flatlist|@tanstack/react-query|@eciperay|@spudly|tamagui|@tamagui)/)',
  ],
  // Explicit babel-jest transform: tamagui/@spudly are hoisted to the
  // workspace root node_modules, outside babel's config-file lookup, so point
  // at the app's babel config directly. Also covers .mjs/.cjs (tamagui ESM).
  transform: {
    '^.+\\.(js|ts|tsx|mjs|cjs)$': [
      'babel-jest',
      // Tamagui/@spudly are hoisted to the workspace root node_modules, outside
      // babel's config-file lookup, so point at the app's babel config directly.
      // <rootDir> is not expanded here; resolve relative to this config file.
      {configFile: require('node:path').join(__dirname, 'babel.config.cjs')},
    ],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      '@react-native/jest-preset/jest/assetFileTransformer.js',
  },
};
