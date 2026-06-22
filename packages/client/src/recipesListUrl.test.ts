import {
  buildListUrl,
  buildPublicRecipesUrl,
  buildSharedWithMeUrl,
} from './recipesListUrl.js';

describe('buildListUrl', () => {
  test('returns base path without params', () => {
    expect(buildListUrl()).toBe('/recipes');
  });

  test('includes limit when provided', () => {
    expect(buildListUrl({limit: 50})).toBe('/recipes?limit=50');
  });

  test('includes offset when provided', () => {
    expect(buildListUrl({offset: 20})).toBe('/recipes?offset=20');
  });

  test('includes limit and offset when both provided', () => {
    expect(buildListUrl({limit: 50, offset: 20})).toBe(
      '/recipes?limit=50&offset=20',
    );
  });

  test('includes search when provided', () => {
    expect(buildListUrl({search: 'pasta', limit: 50, offset: 10})).toBe(
      '/recipes?search=pasta&limit=50&offset=10',
    );
  });

  test('includes development status when provided', () => {
    expect(buildListUrl({developmentStatus: 'in_development'})).toBe(
      '/recipes?developmentStatus=in_development',
    );
  });
});

describe('buildSharedWithMeUrl', () => {
  test('returns base shared-with-me path without params', () => {
    expect(buildSharedWithMeUrl()).toBe('/recipes/shared-with-me');
    expect(buildSharedWithMeUrl({})).toBe('/recipes/shared-with-me');
  });

  test('includes pagination params when provided', () => {
    expect(buildSharedWithMeUrl({limit: 25, offset: 5})).toBe(
      '/recipes/shared-with-me?limit=25&offset=5',
    );
  });
});

describe('buildPublicRecipesUrl', () => {
  test('returns base public recipes path without params', () => {
    expect(buildPublicRecipesUrl()).toBe('/public/recipes');
    expect(buildPublicRecipesUrl({})).toBe('/public/recipes');
  });

  test('includes search, pagination, and sort when provided', () => {
    expect(
      buildPublicRecipesUrl({
        search: 'pasta',
        limit: 20,
        offset: 5,
        sort: 'rating',
      }),
    ).toBe('/public/recipes?search=pasta&limit=20&offset=5&sort=rating');
  });
});
