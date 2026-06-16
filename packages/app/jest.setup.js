// Mocks for native modules that have no Jest implementation.
// This file runs via setupFilesAfterEnv after the test framework is loaded.

// TanStack Query v5 defaults to setTimeout(fn, 0) for its notification
// scheduler. That fires in a later event-loop tick, after RNTL's wrapAsync has
// already restored IS_REACT_ACT_ENVIRONMENT = true, so React 19 sees the state
// update as "outside act()" and logs a console.error warning.
//
// queueMicrotask fires before any timers, during the await-suspension window
// when IS_REACT_ACT_ENVIRONMENT is still false (set by waitFor/findBy helpers).
// React therefore sees the update as "inside act()" — no warning.
//
// Unlike the synchronous fn => fn() scheduler, queueMicrotask defers past
// React's passive-effects phase, so it never triggers the re-entrant flush
// loop that caused timeouts with React 19's act(async) on slow CI runners.
const {notifyManager} = require('@tanstack/react-query');
const {setTestQueryScheduler} = require('./src/__tests__/testUtils.tsx');

const testQueryScheduler = queueMicrotask;

notifyManager.setScheduler(testQueryScheduler);
setTestQueryScheduler(testQueryScheduler);

jest.mock('react-native-keep-awake', () => ({
  activate: jest.fn(),
  deactivate: jest.fn(),
}));

jest.mock('react-native-print', () => ({
  print: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-url-polyfill/auto', () => ({}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// React Navigation — minimal no-op implementations so screens render without error.
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({navigate: jest.fn(), goBack: jest.fn()}),
    useRoute: () => ({params: {}}),
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({children}) => children,
    Screen: () => null,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({children}) => children,
    Screen: () => null,
  }),
}));

const {
  installFailOnConsoleError,
} = require('../../test/failOnConsoleError.cjs');

installFailOnConsoleError();

const {cleanupTestProviders} = require('./src/__tests__/testUtils.tsx');

afterEach(async () => {
  jest.clearAllMocks();
  await cleanupTestProviders();
});
