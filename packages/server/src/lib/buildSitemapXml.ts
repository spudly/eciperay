export type SitemapEntry = {loc: string; lastmod?: string};

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export const buildSitemapXml = (entries: SitemapEntry[]): string => {
  const urls = entries
    .map(entry => {
      const lastmod = entry.lastmod
        ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : '';
      return `<url><loc>${escapeXml(entry.loc)}</loc>${lastmod}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
};
