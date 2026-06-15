import {
  normalizePastedRecipeHtml,
  stripEmbeddedImagesFromHtml,
} from './normalizePastedRecipeHtml.js';

describe('stripEmbeddedImagesFromHtml', () => {
  test('removes img tags with embedded base64 sources', () => {
    const html =
      '<h1>Pasta</h1><img src="data:image/png;base64,abc" /><p>Boil pasta.</p>';
    expect(stripEmbeddedImagesFromHtml(html)).not.toContain('base64,abc');
    expect(stripEmbeddedImagesFromHtml(html)).toContain('Pasta');
  });

  test('keeps remote image tags', () => {
    const html =
      '<p>Pasta</p><img src="https://example.com/photo.jpg" alt="Pasta" />';
    expect(stripEmbeddedImagesFromHtml(html)).toContain(
      'https://example.com/photo.jpg',
    );
  });

  test('keeps image tags without embedded sources', () => {
    const html = '<p>Pasta</p><img alt="Pasta" /><img src="/local.jpg" />';
    expect(stripEmbeddedImagesFromHtml(html)).toContain('<img');
  });

  test('returns plain text unchanged', () => {
    expect(stripEmbeddedImagesFromHtml('Pasta recipe')).toBe('Pasta recipe');
  });
});

describe('normalizePastedRecipeHtml', () => {
  test('extracts an embedded image and strips it from the HTML payload', () => {
    const dataUrl = 'data:image/png;base64,abc';
    const html = `<h1>Pasta</h1><img src="${dataUrl}" /><p>Boil pasta.</p>`;
    const normalized = normalizePastedRecipeHtml(html);
    expect(normalized.imageCandidate).toBe(dataUrl);
    expect(normalized.html).not.toContain('base64,abc');
    expect(normalized.html).toContain('Pasta');
  });
});
