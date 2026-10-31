import {
  DISCOVER_EMPTY_MESSAGE,
  DISCOVER_ERROR_MESSAGE,
  DISCOVER_NO_RATINGS_LABEL,
  DISCOVER_SEARCH_PLACEHOLDER,
  DISCOVER_TITLE,
} from './discoverCopy.js';

describe('discoverCopy', () => {
  test('exports discover page copy constants', () => {
    expect(DISCOVER_TITLE).toBeTruthy();
    expect(DISCOVER_SEARCH_PLACEHOLDER).toBeTruthy();
    expect(DISCOVER_EMPTY_MESSAGE).toBeTruthy();
    expect(DISCOVER_NO_RATINGS_LABEL).toBeTruthy();
    expect(DISCOVER_ERROR_MESSAGE).toBeTruthy();
  });
});
