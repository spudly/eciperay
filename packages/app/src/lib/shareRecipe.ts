import {Share} from 'react-native';
import type {RecipeDetail} from '@recipoo/types';

const buildShareText = (recipe: RecipeDetail): string => {
  const header = `🍴 ${recipe.title}\n(${recipe.servings} servings)`;
  const ingredients = recipe.ingredients
    .map(i => `• ${i.quantity ?? ''} ${i.unit ?? ''} ${i.name}`.trim())
    .join('\n');
  const instructions = recipe.instructions
    .map(s => `${s.stepNumber}. ${s.body}`)
    .join('\n');
  return `${header}\n\nIngredients:\n${ingredients}\n\nInstructions:\n${instructions}`;
};

export const shareRecipe = (recipe: RecipeDetail) =>
  Share.share({
    title: recipe.title,
    message: buildShareText(recipe),
    url: recipe.sourceUrl ?? undefined,
  });
