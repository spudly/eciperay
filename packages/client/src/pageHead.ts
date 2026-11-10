import type {PublicRecipeDetail} from '@eciperay/types';

import {DISCOVER_TITLE} from './discoverCopy.js';
import {LANDING_HERO_SUBTITLE, LANDING_HERO_TITLE} from './landingCopy.js';
import {buildRecipeSocialMeta, RECIPE_SEO_SITE_NAME} from './recipeSeo.js';

// Shared per-page head configuration (#414): the ONE source of the
// title / description / canonical / Open Graph / Twitter values for
// every page. The current client head path (the web PageHead
// components) consumes these builders today; the #304 server-rendering
// layer consumes the same builders when it lands, so a page's values
// are defined exactly once and never forked between the two paths.

export const SEO_SITE_NAME = RECIPE_SEO_SITE_NAME;

export const DEFAULT_WEB_BASE_URL = 'https://www.eciperay.com';

export type PageRobotsDirective = 'index, follow' | 'noindex, nofollow';

export type PageOpenGraph = {
  title: string;
  description: string;
  url: string;
  type: 'website' | 'article';
  // Omitted when the page has no image: no fabricated share image is
  // ever emitted (#414 plan default, approved by Stephen).
  imageUrl?: string;
};

export type PageTwitterCard = {
  card: 'summary' | 'summary_large_image';
  title: string;
  description: string;
  imageUrl?: string;
};

export type PageHeadConfig = {
  title: string;
  description?: string;
  canonicalUrl?: string;
  robots: PageRobotsDirective;
  openGraph?: PageOpenGraph;
  twitter?: PageTwitterCard;
};

export const buildPageTitle = (pageTitle: string): string =>
  `${pageTitle} | ${SEO_SITE_NAME}`;

export const buildCanonicalUrl = (baseUrl: string, path: string): string =>
  new URL(path, baseUrl).toString();

export type StaticPublicPage = {
  path: string;
  pageTitle: string | null;
  description: string;
};

// The static public pages: the sitemap's static entries and the head
// config's public pages both come from this single list.
export const STATIC_PUBLIC_PAGES: readonly StaticPublicPage[] = [
  {path: '/', pageTitle: null, description: LANDING_HERO_SUBTITLE},
  {
    path: '/discover',
    pageTitle: DISCOVER_TITLE,
    description:
      'Browse public recipes shared by the Eciperay community and find your next meal.',
  },
  {
    path: '/privacy',
    pageTitle: 'Privacy Policy',
    description: 'How Eciperay collects, uses, and protects your information.',
  },
  {
    path: '/terms',
    pageTitle: 'Terms of Service',
    description: 'The terms that govern your use of Eciperay.',
  },
];

export const buildStaticPageHead = (
  baseUrl: string,
  page: StaticPublicPage,
): PageHeadConfig => {
  const title =
    page.path === '/'
      ? `${SEO_SITE_NAME} — ${LANDING_HERO_TITLE}`
      : buildPageTitle(page.pageTitle ?? SEO_SITE_NAME);
  const canonicalUrl = buildCanonicalUrl(baseUrl, page.path);
  return {
    title,
    description: page.description,
    canonicalUrl,
    robots: 'index, follow',
    openGraph: {
      title,
      description: page.description,
      url: canonicalUrl,
      type: 'website',
    },
    twitter: {card: 'summary', title, description: page.description},
  };
};

export const buildPublicPageHead = (
  baseUrl: string,
  path: string,
): PageHeadConfig | undefined => {
  const page = STATIC_PUBLIC_PAGES.find(candidate => candidate.path === path);
  return page ? buildStaticPageHead(baseUrl, page) : undefined;
};

export const buildPublicRecipeHead = (
  recipe: PublicRecipeDetail,
  canonicalUrl: string,
): PageHeadConfig => {
  const social = buildRecipeSocialMeta(recipe, canonicalUrl);
  return {
    title: social.title,
    description: social.description,
    canonicalUrl: social.url,
    robots: 'index, follow',
    openGraph: {
      title: social.title,
      description: social.description,
      url: social.url,
      type: 'article',
      ...(social.imageUrl ? {imageUrl: social.imageUrl} : {}),
    },
    twitter: {
      card: social.imageUrl ? 'summary_large_image' : 'summary',
      title: social.title,
      description: social.description,
      ...(social.imageUrl ? {imageUrl: social.imageUrl} : {}),
    },
  };
};

// Authenticated / app-internal pages: a title and a noindex directive
// only — no description, canonical, or social cards.
export const buildAuthenticatedPageHead = (
  pageTitle?: string,
): PageHeadConfig => ({
  title: pageTitle ? buildPageTitle(pageTitle) : SEO_SITE_NAME,
  robots: 'noindex, nofollow',
});
