import {
  buildPublicRecipeHead,
  buildRecipeJsonLd,
  type RecipeCommunityRating,
} from '@eciperay/client';
import type {PublicRecipeDetail} from '@eciperay/types';
import {useEffect, useMemo} from 'react';

import {PageHead} from './PageHead.js';

type RecipePageHeadProps = {
  recipe: PublicRecipeDetail;
  canonicalUrl: string;
  communityRating?: RecipeCommunityRating | null;
};

// The public recipe page's head: the shared head config (#414) applied
// by PageHead, plus the Recipe JSON-LD script (#411's structured data).
export const RecipePageHead = ({
  recipe,
  canonicalUrl,
  communityRating,
}: RecipePageHeadProps) => {
  const config = useMemo(
    () => buildPublicRecipeHead(recipe, canonicalUrl),
    [recipe, canonicalUrl],
  );

  useEffect(() => {
    const jsonLd = document.createElement('script');
    jsonLd.type = 'application/ld+json';
    jsonLd.text = JSON.stringify(
      buildRecipeJsonLd(recipe, canonicalUrl, communityRating),
    );
    document.head.appendChild(jsonLd);
    return () => {
      jsonLd.remove();
    };
  }, [recipe, canonicalUrl, communityRating]);

  return <PageHead config={config} />;
};
