module.exports = {
  preset: '@react-native/jest-preset',
  testTimeout: 15000,
  setupFilesAfterEnv: ['./jest.setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    'env-shim.test.js', // env shim for moduleNameMapper; not a test suite
    'src/__tests__/fixtures/', // shared fixture helpers; not test suites
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts', // type declaration files only
    '!src/navigation/types.ts', // type aliases only, no runtime code
    '!src/lib/env.ts', // typeof branch unreachable when shim always provides a string
    '!src/lib/supabase.ts', // createClient + in-memory storage; tested via supabase.test.ts
    '!src/navigation/*.tsx', // React Navigation setup; no business logic to unit-test
  ],
  coverageThreshold: {
    global: {branches: 100, functions: 100, lines: 100, statements: 100},
  },
  moduleNameMapper: {'^@env$': '<rootDir>/env-shim.test.js'},
  transformIgnorePatterns: [
    // Transform NativeWind and its dependency react-native-css-interop
    'node_modules/(?!(react-native|@react-native|@react-navigation|nativewind|react-native-css-interop|react-native-safe-area-context|react-native-screens|@tanstack/react-query)/)',
  ],
};
