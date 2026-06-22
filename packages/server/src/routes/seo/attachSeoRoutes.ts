import type {Express} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {buildRobotsTxt} from '../../lib/buildRobotsTxt.js';
import {getWebAppBaseUrl} from '../../lib/seoUrls.js';

import {serveSitemap} from './sitemap.js';

type QueryFn = typeof defaultQuery;

export const attachSeoRoutes = (
  app: Express,
  queryFn: QueryFn = defaultQuery,
): void => {
  app.get('/robots.txt', (_req, res) => {
    const sitemapUrl = new URL('/sitemap.xml', getWebAppBaseUrl()).toString();
    res.type('text/plain');
    res.send(buildRobotsTxt(sitemapUrl));
  });

  app.get('/sitemap.xml', (_req, res) => {
    void serveSitemap(res, queryFn);
  });
};
