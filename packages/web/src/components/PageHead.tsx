import type {PageHeadConfig} from '@eciperay/client';
import {useEffect} from 'react';

type PageHeadProps = {config: PageHeadConfig};

type RestoreHeadValue = () => void;

const upsertMeta = (
  attribute: 'name' | 'property',
  key: string,
  content: string,
): RestoreHeadValue => {
  const selector = `meta[${attribute}="${key}"]`;
  const existing = document.head.querySelector(selector);
  if (existing instanceof HTMLMetaElement) {
    const previous = existing.getAttribute('content');
    existing.content = content;
    return () => {
      if (previous === null) {
        existing.removeAttribute('content');
      } else {
        existing.setAttribute('content', previous);
      }
    };
  }
  const meta = document.createElement('meta');
  meta.setAttribute(attribute, key);
  meta.content = content;
  document.head.appendChild(meta);
  return () => {
    meta.remove();
  };
};

const upsertCanonicalLink = (href: string): RestoreHeadValue => {
  const existing = document.head.querySelector('link[rel="canonical"]');
  if (existing instanceof HTMLLinkElement) {
    const previous = existing.getAttribute('href');
    existing.href = href;
    return () => {
      if (previous === null) {
        existing.removeAttribute('href');
      } else {
        existing.setAttribute('href', previous);
      }
    };
  }
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = href;
  document.head.appendChild(link);
  return () => {
    link.remove();
  };
};

// Applies a shared PageHeadConfig (#414, @eciperay/client pageHead) to
// the document head. The config is the single source for the page's
// tags; the #304 server-rendering layer will render the same config
// into the initial HTML when it lands.
export const PageHead = ({config}: PageHeadProps) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = config.title;

    const managedNodes: RestoreHeadValue[] = [
      upsertMeta('name', 'robots', config.robots),
    ];

    if (config.description) {
      managedNodes.push(upsertMeta('name', 'description', config.description));
    }
    if (config.canonicalUrl) {
      managedNodes.push(upsertCanonicalLink(config.canonicalUrl));
    }
    if (config.openGraph) {
      const og = config.openGraph;
      managedNodes.push(
        upsertMeta('property', 'og:title', og.title),
        upsertMeta('property', 'og:description', og.description),
        upsertMeta('property', 'og:url', og.url),
        upsertMeta('property', 'og:type', og.type),
      );
      if (og.imageUrl) {
        managedNodes.push(upsertMeta('property', 'og:image', og.imageUrl));
      }
    }
    if (config.twitter) {
      const twitter = config.twitter;
      managedNodes.push(
        upsertMeta('name', 'twitter:card', twitter.card),
        upsertMeta('name', 'twitter:title', twitter.title),
        upsertMeta('name', 'twitter:description', twitter.description),
      );
      if (twitter.imageUrl) {
        managedNodes.push(
          upsertMeta('name', 'twitter:image', twitter.imageUrl),
        );
      }
    }

    return () => {
      document.title = previousTitle;
      for (const restore of managedNodes) {
        restore();
      }
    };
  }, [config]);

  return null;
};
