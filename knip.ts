import type {KnipConfig} from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['scripts/*.ts', 'eslint-rules/*.ts'],
      project: ['scripts/**/*.ts', 'eslint-rules/**/*.ts'],
      ignoreDependencies: ['patch-package'],
    },
    'packages/types': {entry: ['src/types/index.ts'], project: ['src/**/*.ts']},
    'packages/icons': {},
    'packages/client': {ignore: ['src/test/**']},
    'packages/server': {ignore: ['src/test/**']},
    'packages/app': {
      entry: ['App.tsx'],
      project: ['src/**/*.ts', 'src/**/*.tsx', '*.tsx', '*.js'],
      ignoreDependencies: [
        '@babel/preset-env',
        '@babel/runtime',
        'dotenv',
        'expo-updates',
      ],
    },
    'packages/web': {ignore: ['src/test/**']},
  },
  ignore: ['**/*.d.ts'],
  ignoreDependencies: ['@types/*'],
};

export default config;
