import type {LinguiConfig} from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['en-US', 'en-XA'],
  sourceLocale: 'en-US',
  fallbackLocales: {default: 'en-US'},
  catalogs: [
    {
      path: '<rootDir>/src/i18n/locales/{locale}/messages',
      include: ['src'],
    },
  ],
};

export default config;
