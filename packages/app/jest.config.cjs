module.exports = {
  preset: '@react-native/jest-preset',
  testTimeout: 15_000,
  setupFiles: ['<rootDir>/jest.env.js'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  // Teardown clears QueryClients, but React Native / TanStack Query can still
  // leave handles open on Linux CI; forceExit avoids a ~5 minute hang there.
  forceExit: !!process.env.CI,
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
    'node_modules/(?!(react-native|@react-native|@react-navigation|nativewind|react-native-css|react-native-css-interop|react-native-reanimated|react-native-worklets|react-native-safe-area-context|react-native-screens|react-native-blob-util|react-native-gesture-handler|react-native-draggable-flatlist|@tanstack/react-query|@eciperay)/)',
  ],
};
