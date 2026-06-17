module.exports = api => {
  const isTest = api.env('test');

  return {
    presets: [
      'module:@react-native/babel-preset',
      ...(isTest ? [] : ['nativewind/babel']),
    ],
    plugins: isTest ? [] : ['react-native-reanimated/plugin'],
  };
};
