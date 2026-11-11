module.exports = api => {
  const isTest = api.env('test');

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      // zod v4 ships `export * as ns from` re-exports; the RN preset's
      // commonjs transform asserts unless this transform runs first.
      '@babel/plugin-transform-export-namespace-from',
      ...(isTest ? [] : ['react-native-reanimated/plugin']),
    ],
  };
};
