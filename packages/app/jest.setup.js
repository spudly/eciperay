// Mocks for native modules that have no Jest implementation.
// This file runs via setupFilesAfterEnv after the test framework is loaded.

const {notifyManager} = require('@tanstack/react-query');

const {
  installFailOnConsoleError,
} = require('../../test/failOnConsoleError.cjs');

const {
  cleanupTestProviders,
  setTestQueryScheduler,
} = require('./src/__tests__/testUtils.tsx');

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
const testQueryScheduler = queueMicrotask;

notifyManager.setScheduler(testQueryScheduler);
setTestQueryScheduler(testQueryScheduler);

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

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

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => ({
      capture: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      isFeatureEnabled: jest.fn(),
      getFeatureFlag: jest.fn(),
      getFeatureFlagPayload: jest.fn(),
      onFeatureFlags: jest.fn(() => jest.fn()),
      reloadFeatureFlags: jest.fn(),
      captureException: jest.fn(),
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      },
    })),
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: {CacheDir: '/cache'},
      writeFile: jest.fn().mockResolvedValue(),
      unlink: jest.fn().mockResolvedValue(),
      exists: jest.fn().mockResolvedValue(true),
    },
  },
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    GestureHandlerRootView: ({children}) =>
      React.createElement(View, null, children),
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlatList: require('react-native').FlatList,
  };
});

jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const {View, TouchableOpacity, Text} = require('react-native');
  const noopDrag = () => {
    /* drag noop for tests */
  };
  const DraggableFlatList = ({data, renderItem, keyExtractor, onDragEnd}) =>
    React.createElement(
      View,
      null,
      data.map((item, index) =>
        React.createElement(
          View,
          {key: keyExtractor(item)},
          renderItem({item, index, getIndex: () => index, drag: noopDrag}),
          React.createElement(
            TouchableOpacity,
            {
              accessibilityLabel: `Mock reorder ${keyExtractor(item)}`,
              onPress: () => {
                if (index > 0) {
                  const next = [...data];
                  const [moved] = next.splice(index, 1);
                  next.splice(index - 1, 0, moved);
                  onDragEnd({data: next, from: index, to: index - 1});
                }
              },
            },
            React.createElement(Text, null, 'Mock reorder up'),
          ),
        ),
      ),
    );
  return {__esModule: true, default: DraggableFlatList};
});

jest.mock('react-native-url-polyfill/auto', () => ({}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
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

jest.mock('react-native-vector-icons/Feather', () => {
  const React = require('react');
  const {Text} = require('react-native');

  return {
    __esModule: true,
    default: ({accessibilityLabel}) =>
      React.createElement(Text, {accessibilityLabel}, 'icon'),
  };
});

installFailOnConsoleError();

afterEach(async () => {
  jest.clearAllMocks();
  await cleanupTestProviders();
});
