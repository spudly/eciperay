import {createI18n, recipeCountLabel} from './i18n';

describe('createI18n', () => {
  it('formats the plural spike message in en-US', () => {
    const i18n = createI18n('en-US');
    expect(recipeCountLabel(i18n, 1)).toBe('1 recipe');
    expect(recipeCountLabel(i18n, 5)).toBe('5 recipes');
  });

  it('formats the plural spike message in the en-XA pseudo-locale', () => {
    const i18n = createI18n('en-XA');
    expect(recipeCountLabel(i18n, 1)).toBe('1 recipe~');
    expect(recipeCountLabel(i18n, 5)).toBe('5 recipes~~');
  });
});
