import {
  buildCanonicalUrl,
  STATIC_PUBLIC_PAGES,
} from '@eciperay/client/pageHead';
import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  buildPublicRecipeCanonicalUrl,
  getWebAppBaseUrl,
} from '../../lib/seoUrls.js';
import {buildSitemapXml, type SitemapEntry} from '../../lib/buildSitemapXml.js';
import {LIST_PUBLIC_RECIPES_SITEMAP_SQL} from '../recipes/sqlConstants.js';

type QueryFn = typeof defaultQuery;

type SitemapRow = {id: string; slug: string; updated_at: string | Date};

// Short-TTL in-memory cache (#414): the sitemap is regenerated at most
// once per TTL window; expiry is the only invalidation step.
export const SITEMAP_CACHE_TTL_MS = 5 * 60 * 1000;

type SitemapCacheEntry = {baseUrl: string; xml: string; expiresAt: number};

let sitemapCache: SitemapCacheEntry | null = null;

export const clearSitemapCache = (): void => {
  sitemapCache = null;
};

export const serveSitemap = async (
  res: Response,
  queryFn: QueryFn = defaultQuery,
  now: number = Date.now(),
) => {
  const baseUrl = getWebAppBaseUrl();

  res.type('application/xml');
  res.set(
    'Cache-Control',
    `public, max-age=${Math.floor(SITEMAP_CACHE_TTL_MS / 1000)}`,
  );

  if (
    sitemapCache &&
    sitemapCache.baseUrl === baseUrl &&
    now < sitemapCache.expiresAt
  ) {
    res.send(sitemapCache.xml);
    return;
  }

  const result = await queryFn(LIST_PUBLIC_RECIPES_SITEMAP_SQL, []);
  const staticEntries: SitemapEntry[] = STATIC_PUBLIC_PAGES.map(page => ({
    loc: buildCanonicalUrl(baseUrl, page.path),
  }));
  const recipeEntries: SitemapEntry[] = result.rows.map(row => {
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

  const xml = buildSitemapXml([...staticEntries, ...recipeEntries]);
  sitemapCache = {baseUrl, xml, expiresAt: now + SITEMAP_CACHE_TTL_MS};
  res.send(xml);
};
