import {setupI18n, type I18n, type Messages} from '@lingui/core';

import type {SupportedLocale} from './locale.js';

/**
 * The compiled per-locale catalogs, assembled by each host from its own
 * `locales/` folder and injected here (#673). The catalogs themselves stay
 * host-local until #681 shares them; this factory is the single
 * implementation both hosts (and their tests) create instances through.
 */
export type I18nCatalogs = Record<SupportedLocale, Messages>;

/** Create an i18n instance with the injected catalog for `locale` active. */
export const createI18n = (locale: SupportedLocale, catalogs: I18nCatalogs): I18n => {
  const i18n = setupI18n();
  i18n.loadAndActivate({locale, messages: catalogs[locale]});
  return i18n;
};

/**
 * Spike acceptance string (kept as a regression test): the plural message
 * from the PO catalog, formatted through Lingui core — this exercises
 * Intl.PluralRules for the one/other plural forms.
 */
export const recipeCountLabel = (i18n: I18n, count: number): string =>
  i18n._('spike.recipeCount', {count});
