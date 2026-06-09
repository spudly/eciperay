import {extractImageUrlFromHtml} from './extractImageFromHtml.js';

describe('extractImageUrlFromHtml', () => {
  test('returns the first supported image URL', () => {
    expect(
      extractImageUrlFromHtml(
        '<p>Pasta</p><img src="https://example.com/photo.jpg" alt="Pasta" />',
      ),
    ).toBe('https://example.com/photo.jpg');
  });

  test('returns a data URL image', () => {
    expect(
      extractImageUrlFromHtml(
        '<img src="data:image/png;base64,abc" /><p>Recipe</p>',
      ),
    ).toBe('data:image/png;base64,abc');
  });

  test('ignores plain text without HTML', () => {
    expect(extractImageUrlFromHtml('Pasta recipe')).toBeNull();
  });

  test('ignores unsupported image sources', () => {
    expect(
      extractImageUrlFromHtml('<img src="/local/photo.jpg" />'),
    ).toBeNull();
  });
});
