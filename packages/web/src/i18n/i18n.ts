import {createI18n as createSharedI18n, recipeCountLabel, type I18nCatalogs} from '@eciperay/client';
import type {I18n} from '@lingui/core';

import {messages as enUSMessages} from './locales/en-US/messages.po';
import {messages as enXAMessages} from './locales/en-XA/messages.po';
import type {SupportedLocale} from '@eciperay/client';

// The catalogs stay host-local until #681 shares them; the shared factory
// in @eciperay/client (#673) creates the instance from the injected catalogs.
const catalogs: I18nCatalogs = {
  'en-US': enUSMessages,
  'en-XA': enXAMessages,
};

/** Create an i18n instance with this host's compiled catalog for `locale` active. */
export const createI18n = (locale: SupportedLocale): I18n =>
  createSharedI18n(locale, catalogs);

export {recipeCountLabel};
