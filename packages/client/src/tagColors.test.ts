import {TAG_COLOR_OPTIONS, TAG_COLOR_NAME_OPTIONS} from './tagColors.js';

describe('TAG_COLOR_OPTIONS', () => {
  test('offers the fixed swatch palette, default color first', () => {
    expect(TAG_COLOR_OPTIONS).toHaveLength(12);
    expect(TAG_COLOR_OPTIONS[0]).toBe('#6366f1');
    expect(new Set(TAG_COLOR_OPTIONS).size).toBe(TAG_COLOR_OPTIONS.length);
    for (const color of TAG_COLOR_OPTIONS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  test('offers the twelve color names for the DS swatches', () => {
    expect(TAG_COLOR_NAME_OPTIONS).toHaveLength(12);
    expect(new Set(TAG_COLOR_NAME_OPTIONS).size).toBe(12);
  });
});
