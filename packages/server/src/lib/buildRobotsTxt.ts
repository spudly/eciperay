export const buildRobotsTxt = (sitemapUrl: string): string => `User-agent: *
Allow: /recipe/
Allow: /discover
Allow: /privacy
Allow: /terms
Disallow: /api/
Disallow: /recipes
Disallow: /shared-with-me
Disallow: /profile
Disallow: /add
Disallow: /tags
Disallow: /import
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /reset-password

Sitemap: ${sitemapUrl}
`;
