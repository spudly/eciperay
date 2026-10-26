import {TAG_COLOR_OPTIONS} from './tagColors';

describe('TAG_COLOR_OPTIONS', () => {
  test('offers twelve unique hex colors', () => {
    expect(TAG_COLOR_OPTIONS).toHaveLength(12);
    expect(new Set(TAG_COLOR_OPTIONS).size).toBe(12);
    for (const color of TAG_COLOR_OPTIONS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
