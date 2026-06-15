import {buildListUrl} from './recipesListUrl.js';

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
});
