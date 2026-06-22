import {buildSitemapXml} from './buildSitemapXml.js';

describe('buildSitemapXml', () => {
  test('builds urlset XML with escaped values', () => {
    const xml = buildSitemapXml([
      {loc: 'https://www.eciperay.com/recipe/r1/pasta', lastmod: '2024-01-02'},
      {loc: 'https://www.eciperay.com/recipe/r2/soup&chowder'},
    ]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<loc>https://www.eciperay.com/recipe/r1/pasta</loc><lastmod>2024-01-02</lastmod>',
    );
    expect(xml).toContain(
      '<loc>https://www.eciperay.com/recipe/r2/soup&amp;chowder</loc>',
    );
  });
});
