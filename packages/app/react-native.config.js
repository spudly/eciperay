/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
  dependencies: {
    // Metro-only dependency for NativeWind's CSS pipeline; not a native module.
    expo: {platforms: {android: null, ios: null}},
  },
};
