import {buildRobotsTxt} from './buildRobotsTxt.js';

describe('buildRobotsTxt', () => {
  test('allows public routes and points to the sitemap', () => {
    const robots = buildRobotsTxt('https://www.eciperay.com/sitemap.xml');
    expect(robots).toContain('Allow: /recipe/');
    expect(robots).toContain('Allow: /discover');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Sitemap: https://www.eciperay.com/sitemap.xml');
  });
});
