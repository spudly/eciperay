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
    {
      // Shared core catalog in @eciperay/client (#681): registering its
      // path is what lets @lingui/vite-plugin compile the core .po
      // imports in src/i18n/i18n.ts. Its include deliberately covers no
      // translatable source (the catalog folder itself), so
      // `lingui extract` never assigns host messages to the core
      // catalog — core membership is managed by
      // scripts/i18n-dedupe-catalogs.mjs after extraction.
      path: '<rootDir>/../client/src/i18n/locales/{locale}/messages',
      include: ['../client/src/i18n'],
    },
  ],
};

export default config;
