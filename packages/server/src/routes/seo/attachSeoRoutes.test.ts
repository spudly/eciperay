import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {LIST_PUBLIC_RECIPES_SITEMAP_SQL} from '../recipes/sqlConstants.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

import {clearSitemapCache} from './sitemap.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery, serveWeb: false});

describe('attachSeoRoutes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    clearSitemapCache();
  });

  test('GET /robots.txt allows public routes and references sitemap', async () => {
    const res = await request(getApp()).get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/plain/);
    expect(res.text).toContain('Allow: /recipe/');
    expect(res.text).toContain('Sitemap: https://www.eciperay.com/sitemap.xml');
  });

  test('GET /sitemap.xml lists canonical public recipe URLs', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'recipe-public-1',
          slug: 'shared-pasta',
          updated_at: '2024-01-02T12:00:00.000Z',
        },
      ]),
    );

    const res = await request(getApp()).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/xml/);
    expect(res.text).toContain(
      'https://www.eciperay.com/recipe/recipe-public-1/shared-pasta',
    );
    expect(res.text).toContain('<lastmod>2024-01-02</lastmod>');
    expect(res.headers['cache-control']).toContain('max-age=300');
    expect(mockQuery).toHaveBeenCalledWith(LIST_PUBLIC_RECIPES_SITEMAP_SQL, []);
  });

  test('GET /sitemap.xml includes the static public pages', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp()).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<loc>https://www.eciperay.com/</loc>');
    expect(res.text).toContain('<loc>https://www.eciperay.com/discover</loc>');
    expect(res.text).toContain('<loc>https://www.eciperay.com/privacy</loc>');
    expect(res.text).toContain('<loc>https://www.eciperay.com/terms</loc>');
  });
});
