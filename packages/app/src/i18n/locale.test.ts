import {DEFAULT_LOCALE, resolveLocale} from './locale';

describe('resolveLocale', () => {
  it('defaults to en-US when nothing matches', () => {
    expect(resolveLocale(null, [])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined, ['fr-FR', 'de-DE'])).toBe('en-US');
  });

  it('prefers the stored choice over platform candidates', () => {
    expect(resolveLocale('en-XA', ['en-US'])).toBe('en-XA');
  });

  it('falls through an unsupported stored choice to candidates', () => {
    expect(resolveLocale('fr-FR', ['en-XA'])).toBe('en-XA');
  });

  it('takes the first matching candidate in order', () => {
    expect(resolveLocale(null, ['fr-FR', 'en-XA', 'en-US'])).toBe('en-XA');
  });

  it('matches case-insensitively and by primary language', () => {
    expect(resolveLocale(null, ['EN-xa'])).toBe('en-XA');
    expect(resolveLocale(null, ['en-GB'])).toBe('en-US');
    expect(resolveLocale(' en-us ', [])).toBe('en-US');
  });
});
