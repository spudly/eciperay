import {createI18n, recipeCountLabel, type I18nCatalogs} from './i18n.js';

const catalogs: I18nCatalogs = {
  'en-US': {
    'spike.recipeCount': '{count, plural, one {{count} recipe} other {{count} recipes}}',
  },
  'en-XA': {
    'spike.recipeCount': '{count, plural, one {{count} recipe~} other {{count} recipes~~}}',
  },
};

describe('createI18n', () => {
  it('formats the plural spike message in en-US', () => {
    const i18n = createI18n('en-US', catalogs);
    expect(recipeCountLabel(i18n, 1)).toBe('1 recipe');
    expect(recipeCountLabel(i18n, 5)).toBe('5 recipes');
  });

  it('formats the plural spike message in the en-XA pseudo-locale', () => {
    const i18n = createI18n('en-XA', catalogs);
    expect(recipeCountLabel(i18n, 1)).toBe('1 recipe~');
    expect(recipeCountLabel(i18n, 5)).toBe('5 recipes~~');
  });
});
