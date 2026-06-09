import {buildShareText} from '@recipoo/client';
import type {RecipeDetail} from '@recipoo/types';

export const shareRecipe = async (recipe: RecipeDetail) => {
  const text = buildShareText(recipe);
  if (typeof navigator.share === 'function') {
    await navigator.share({
      title: recipe.title,
      text,
      url: recipe.sourceUrl ?? undefined,
    });
    return;
  }
  await navigator.clipboard.writeText(text);
};
