import {buildDiscoverItemListJsonLd} from '@eciperay/client';
import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {useEffect} from 'react';

type RecipesPageHeadProps = {recipes: PublicRecipeDiscoveryItem[]};

// Emits the public browse ItemList JSON-LD (#411) through the same
// head-injection path RecipePageHead uses for the Recipe JSON-LD.
// It is part of the unified Recipes page's head (#622): the signed-out
// browse renders it alongside StaticPageHead.
export const RecipesPageHead = ({recipes}: RecipesPageHeadProps) => {
  useEffect(() => {
    // Google's carousel markup needs at least two listed recipes.
    if (recipes.filter(recipe => recipe.visibility === 'public').length < 2) {
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
