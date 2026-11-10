// Deliberate robots rules (#414): public pages are crawlable,
// authenticated / app-internal paths and the API are not, and the
// sitemap is referenced so crawlers discover public recipes.
export const buildRobotsTxt = (sitemapUrl: string): string => `User-agent: *
Allow: /
Allow: /recipe/
Allow: /discover
Allow: /privacy
Allow: /terms
Disallow: /api/
Disallow: /recipes
Disallow: /meals
Disallow: /meal-plans
Disallow: /shared-with-me
Disallow: /profile
Disallow: /add
Disallow: /tags
Disallow: /import
Disallow: /pay
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /reset-password

Sitemap: ${sitemapUrl}
`;
