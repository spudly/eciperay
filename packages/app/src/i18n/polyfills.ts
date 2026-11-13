// Hermes lacks Intl.Locale and Intl.PluralRules, which Lingui's plural
// formatting depends on — these polyfills must load before any Lingui
// runtime use in the native app. The .js-suffixed subpaths are the ones
// the @formatjs packages export (NodeNext resolution requires them).
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
