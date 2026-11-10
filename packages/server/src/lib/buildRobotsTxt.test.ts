import {buildRobotsTxt} from './buildRobotsTxt.js';

describe('buildRobotsTxt', () => {
  test('allows public routes and points to the sitemap', () => {
    const robots = buildRobotsTxt('https://www.eciperay.com/sitemap.xml');
    expect(robots).toContain('Allow: /recipe/');
    expect(robots).toContain('Allow: /discover');
    expect(robots).toContain('Allow: /privacy');
    expect(robots).toContain('Allow: /terms');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Sitemap: https://www.eciperay.com/sitemap.xml');
  });

  test('disallows authenticated and app-internal routes', () => {
    const robots = buildRobotsTxt('https://www.eciperay.com/sitemap.xml');
    for (const path of [
      '/recipes',
      '/meals',
      '/meal-plans',
      '/shared-with-me',
      '/profile',
      '/add',
      '/tags',
      '/import',
      '/pay',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
    ]) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
  });
});
