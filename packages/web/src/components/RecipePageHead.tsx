import {
  buildRecipeJsonLd,
  buildRecipeSocialMeta,
  type RecipeCommunityRating,
} from '@eciperay/client';
import type {PublicRecipeDetail} from '@eciperay/types';
import {useEffect} from 'react';

type RecipePageHeadProps = {
  recipe: PublicRecipeDetail;
  canonicalUrl: string;
  communityRating?: RecipeCommunityRating | null;
};

const upsertMeta = (
  attribute: 'name' | 'property',
  key: string,
  content: string,
): HTMLMetaElement => {
  const selector = `meta[${attribute}="${key}"]`;
  const existing = document.head.querySelector(selector);
  if (existing instanceof HTMLMetaElement) {
    existing.content = content;
    return existing;
  }
  const meta = document.createElement('meta');
  meta.setAttribute(attribute, key);
  meta.content = content;
  document.head.appendChild(meta);
  return meta;
};

const upsertCanonicalLink = (href: string): HTMLLinkElement => {
  const existing = document.head.querySelector('link[rel="canonical"]');
  if (existing instanceof HTMLLinkElement) {
    existing.href = href;
    return existing;
  }
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = href;
  document.head.appendChild(link);
  return link;
};

export const RecipePageHead = ({
  recipe,
  canonicalUrl,
  communityRating,
}: RecipePageHeadProps) => {
  useEffect(() => {
    const previousTitle = document.title;
    const social = buildRecipeSocialMeta(recipe, canonicalUrl);
    document.title = social.title;

    const managedNodes: HTMLElement[] = [
      upsertMeta('name', 'description', social.description),
      upsertMeta('property', 'og:title', social.title),
      upsertMeta('property', 'og:description', social.description),
      upsertMeta('property', 'og:url', social.url),
      upsertMeta('property', 'og:type', 'article'),
      upsertMeta(
        'name',
        'twitter:card',
        social.imageUrl ? 'summary_large_image' : 'summary',
      ),
      upsertMeta('name', 'twitter:title', social.title),
      upsertMeta('name', 'twitter:description', social.description),
      upsertCanonicalLink(social.url),
    ];

    if (social.imageUrl) {
      managedNodes.push(
        upsertMeta('property', 'og:image', social.imageUrl),
        upsertMeta('name', 'twitter:image', social.imageUrl),
      );
    }

    const jsonLd = document.createElement('script');
    jsonLd.type = 'application/ld+json';
    jsonLd.text = JSON.stringify(
      buildRecipeJsonLd(recipe, canonicalUrl, communityRating),
    );
    document.head.appendChild(jsonLd);
    managedNodes.push(jsonLd);

    return () => {
      document.title = previousTitle;
      for (const node of managedNodes) {
        node.remove();
      }
    };
  }, [recipe, canonicalUrl, communityRating]);

  return null;
};
