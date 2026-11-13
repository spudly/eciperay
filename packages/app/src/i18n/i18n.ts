import {setupI18n, type I18n} from '@lingui/core';

import {messages as enUSMessages} from './locales/en-US/messages';
import {messages as enXAMessages} from './locales/en-XA/messages';
import type {SupportedLocale} from './locale';

const catalogs: Record<SupportedLocale, typeof enUSMessages> = {
  'en-US': enUSMessages,
  'en-XA': enXAMessages,
};

/** Create an i18n instance with the compiled catalog for `locale` active. */
export const createI18n = (locale: SupportedLocale): I18n => {
  const i18n = setupI18n();
  i18n.loadAndActivate({locale, messages: catalogs[locale]});
  return i18n;
};

/**
 * Spike acceptance string (kept as a regression test): the plural message
 * from the PO catalog, formatted through Lingui core — this exercises
 * Intl.PluralRules in Metro/Hermes (Jest/Babel) for the one/other plural forms.
 */
export const recipeCountLabel = (i18n: I18n, count: number): string =>
  i18n._('spike.recipeCount', {count});
