import {createI18n as createSharedI18n, recipeCountLabel, type I18nCatalogs} from '@eciperay/client';
import {messages as coreEnUSMessages} from '@eciperay/client/i18n/locales/en-US/messages.po';
import {messages as coreEnXAMessages} from '@eciperay/client/i18n/locales/en-XA/messages.po';
import type {I18n} from '@lingui/core';

import {messages as enUSMessages} from './locales/en-US/messages.po';
import {messages as enXAMessages} from './locales/en-XA/messages.po';
import type {SupportedLocale} from '@eciperay/client';

// The shared core catalog (@eciperay/client, #681) holds the strings both
// hosts render identically; this host's catalog holds only its own strings
// (including host variants whose copy differs per host). Host entries win on
// any future collision. The shared factory in @eciperay/client (#673)
// creates the instance from the merged catalogs.
const catalogs: I18nCatalogs = {
  'en-US': {...coreEnUSMessages, ...enUSMessages},
  'en-XA': {...coreEnXAMessages, ...enXAMessages},
};

/** Create an i18n instance with the merged core + host catalog for `locale` active. */
export const createI18n = (locale: SupportedLocale): I18n =>
  createSharedI18n(locale, catalogs);

export {recipeCountLabel};
