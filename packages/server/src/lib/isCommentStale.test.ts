import {isCommentStale} from './isCommentStale.js';

describe('isCommentStale', () => {
  test('returns false when comment revision is null', () => {
    expect(isCommentStale(null, 3)).toBe(false);
  });

  test('returns false when comment matches current recipe revision', () => {
    expect(isCommentStale(3, 3)).toBe(false);
  });

  test('returns true when comment predates recipe content revision', () => {
    expect(isCommentStale(2, 3)).toBe(true);
  });
});
