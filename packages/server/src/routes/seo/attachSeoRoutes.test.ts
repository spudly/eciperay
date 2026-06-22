import request from 'supertest';

import {createApp} from '../../server.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {LIST_PUBLIC_RECIPES_SITEMAP_SQL} from '../recipes/sqlConstants.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery, serveWeb: false});

describe('attachSeoRoutes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('GET /robots.txt allows public routes and references sitemap', async () => {
    const res = await request(app).get('/robots.txt');
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

    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/xml/);
    expect(res.text).toContain(
      'https://www.eciperay.com/recipe/recipe-public-1/shared-pasta',
    );
    expect(res.text).toContain('<lastmod>2024-01-02</lastmod>');
    expect(mockQuery).toHaveBeenCalledWith(LIST_PUBLIC_RECIPES_SITEMAP_SQL, []);
  });
});
