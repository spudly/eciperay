import {buildDiscoverItemListJsonLd} from '@eciperay/client';
import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {useEffect} from 'react';

type DiscoverPageHeadProps = {recipes: PublicRecipeDiscoveryItem[]};

// Emits the Discover ItemList JSON-LD (#411) through the same
// head-injection path RecipePageHead uses for the Recipe JSON-LD.
export const DiscoverPageHead = ({recipes}: DiscoverPageHeadProps) => {
  useEffect(() => {
    if (recipes.length === 0) {
      return;
    }
    const jsonLd = document.createElement('script');
    jsonLd.type = 'application/ld+json';
    jsonLd.text = JSON.stringify(
      buildDiscoverItemListJsonLd(recipes, window.location.origin),
    );
    document.head.appendChild(jsonLd);
    return () => {
      jsonLd.remove();
    };
  }, [recipes]);

  return null;
};
