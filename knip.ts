import type {KnipConfig} from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['scripts/*.ts', 'eslint-rules/*.ts'],
      project: ['scripts/**/*.ts', 'eslint-rules/**/*.ts'],
      ignoreDependencies: [
        'patch-package', // invoked via postinstall hook
        '@commitlint/types', // type-only import in commitlint.config.cjs
      ],
    },
    'packages/types': {entry: ['src/types/index.ts'], project: ['src/**/*.ts']},
    'packages/icons': {},
    // test files use their own entry points; excluding avoids false "unused export" noise
    'packages/client': {ignore: ['src/test/**']},
    'packages/server': {ignore: ['src/test/**']},
    'packages/app': {
      entry: ['App.tsx'],
      project: ['src/**/*.ts', 'src/**/*.tsx', '*.tsx', '*.js'],
      ignoreDependencies: [
        '@babel/preset-env', // peer dep of @react-native/babel-preset (resolved at build time)
        '@babel/runtime', // peer dep of react-native (implicit runtime helper)
        '@env', // virtual module resolved by metro.config.js extraNodeModules
        'dotenv', // required in scripts/envShim.cjs (not statically detectable)
        'expo-updates', // native module linked at build time by expo autolinking
        'metro-resolver', // required in metro.config.js (knip doesn't scan CJS configs)
      ],
    },
    'packages/web': {ignore: ['src/test/**']}, // same as client/server above
  },
  ignore: ['**/*.d.ts'], // ambient type declarations have no importable exports
};

export default config;
