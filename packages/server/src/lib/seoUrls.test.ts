import {buildPublicRecipeCanonicalUrl, getWebAppBaseUrl} from './seoUrls.js';

describe('seoUrls', () => {
  test('returns configured or default web base URL', () => {
    const previous = process.env['WEB_APP_BASE_URL'];
    delete process.env['WEB_APP_BASE_URL'];
    expect(getWebAppBaseUrl()).toBe('https://www.eciperay.com');
    process.env['WEB_APP_BASE_URL'] = 'https://staging.eciperay.com';
    expect(getWebAppBaseUrl()).toBe('https://staging.eciperay.com');
    if (previous === undefined) {
      delete process.env['WEB_APP_BASE_URL'];
    } else {
      process.env['WEB_APP_BASE_URL'] = previous;
    }
  });

  test('builds canonical public recipe URLs', () => {
    expect(
      buildPublicRecipeCanonicalUrl('https://www.eciperay.com', {
        id: 'recipe-1',
        slug: 'pasta',
      }),
    ).toBe('https://www.eciperay.com/recipe/recipe-1/pasta');
  });
});
