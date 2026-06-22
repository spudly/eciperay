import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  buildPublicRecipeCanonicalUrl,
  getWebAppBaseUrl,
} from '../../lib/seoUrls.js';
import {buildSitemapXml} from '../../lib/buildSitemapXml.js';
import {LIST_PUBLIC_RECIPES_SITEMAP_SQL} from '../recipes/sqlConstants.js';

type QueryFn = typeof defaultQuery;

type SitemapRow = {id: string; slug: string; updated_at: string | Date};

export const serveSitemap = async (
  res: Response,
  queryFn: QueryFn = defaultQuery,
) => {
  const baseUrl = getWebAppBaseUrl();
  const result = await queryFn(LIST_PUBLIC_RECIPES_SITEMAP_SQL, []);
  const entries = result.rows.map(row => {
    const recipe = row as SitemapRow;
    const updatedAt =
      recipe.updated_at instanceof Date
        ? recipe.updated_at.toISOString()
        : recipe.updated_at;
    return {
      loc: buildPublicRecipeCanonicalUrl(baseUrl, {
        id: recipe.id,
        slug: recipe.slug,
      }),
      lastmod: updatedAt.slice(0, 10),
    };
  });

  res.type('application/xml');
  res.send(buildSitemapXml(entries));
};
