// Hermes lacks Intl.Locale and Intl.PluralRules, which Lingui's plural
// formatting depends on — these polyfills must load before any Lingui
// runtime use in the native app.
import '@formatjs/intl-locale/polyfill';
import '@formatjs/intl-pluralrules/polyfill';
import '@formatjs/intl-pluralrules/locale-data/en';
