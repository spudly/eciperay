import type {RecipeDetail} from '@recipoo/types';

export const buildShareText = (recipe: RecipeDetail): string => {
  const header = `🍴 ${recipe.title}\n(${recipe.servings} servings)`;
  const ingredients = recipe.ingredients
    .map(i => `• ${i.quantity ?? ''} ${i.unit ?? ''} ${i.name}`.trim())
    .join('\n');
  const instructions = recipe.instructions
    .map(s => `${s.stepNumber}. ${s.body}`)
    .join('\n');
  return `${header}\n\nIngredients:\n${ingredients}\n\nInstructions:\n${instructions}`;
};
