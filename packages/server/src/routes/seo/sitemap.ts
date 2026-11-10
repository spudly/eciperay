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
let sitemapInflight: {baseUrl: string; promise: Promise<string>} | null = null;

export const clearSitemapCache = (): void => {
  sitemapCache = null;
  sitemapInflight = null;
};

const buildSitemap = async (
  baseUrl: string,
  queryFn: QueryFn,
  now: number,
): Promise<string> => {
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
  return xml;
};

export const serveSitemap = async (
  res: Response,
  queryFn: QueryFn = defaultQuery,
  now: number = Date.now(),
) => {
  const baseUrl = getWebAppBaseUrl();

  if (
    sitemapCache &&
    sitemapCache.baseUrl === baseUrl &&
    now < sitemapCache.expiresAt
  ) {
    res.type('application/xml');
    res.set(
      'Cache-Control',
      `public, max-age=${Math.floor(SITEMAP_CACHE_TTL_MS / 1000)}`,
    );
    res.send(sitemapCache.xml);
    return;
  }

  // Deduplicate concurrent refreshes for the same baseUrl: a crawler
  // burst at TTL expiry shares one in-flight query/build.
  if (!sitemapInflight || sitemapInflight.baseUrl !== baseUrl) {
    const promise = buildSitemap(baseUrl, queryFn, now).finally(() => {
      if (sitemapInflight?.promise === promise) {
        sitemapInflight = null;
      }
    });
    sitemapInflight = {baseUrl, promise};
  }
  const xml = await sitemapInflight.promise;

  // Headers are set only after the build succeeds, so a failed query
  // never leaves a public Cache-Control header on an error response.
  res.type('application/xml');
  res.set(
    'Cache-Control',
    `public, max-age=${Math.floor(SITEMAP_CACHE_TTL_MS / 1000)}`,
  );
  res.send(xml);
};
