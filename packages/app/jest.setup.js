// Mocks for native modules that have no Jest implementation.
// This file runs via setupFilesAfterEnv after the test framework is loaded.

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

// Global afterEach cleanup
afterEach(() => {
  jest.clearAllMocks();
});
