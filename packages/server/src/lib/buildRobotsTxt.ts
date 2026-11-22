// Deliberate robots rules (#414): public pages are crawlable,
// authenticated / app-internal paths and the API are not, and the
// sitemap is referenced so crawlers discover public recipes.
// The browse page itself is public at exactly /recipes (#622: it is the
// one unified browse), so it is allowed with the $ end anchor while its
// authenticated subpaths stay disallowed by the /recipes prefix rule.
export const buildRobotsTxt = (sitemapUrl: string): string => `User-agent: *
Allow: /
Allow: /recipe/
Allow: /recipes$
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
