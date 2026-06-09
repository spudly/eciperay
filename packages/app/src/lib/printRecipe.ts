import Print from 'react-native-print';
import type {RecipeDetail} from '@recipoo/types';

const CSS = `body{font-family:Georgia,serif;max-width:600px;margin:40px auto;padding:0 20px}
h1{font-size:28px;margin-bottom:4px}.meta{color:#666;font-size:14px;margin-bottom:24px}
h2{font-size:18px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:24px}
ul,ol{padding-left:20px;line-height:1.8}`;

const ingredientLine = (i: RecipeDetail['ingredients'][number]): string => {
  const qty = i.quantity ? `${i.quantity} ${i.unit ?? ''}` : '';
  return `<li>${qty.trim()} ${i.name}${i.notes ? ` (${i.notes})` : ''}</li>`;
};

const instructionItem = (s: RecipeDetail['instructions'][number]): string =>
  `<li>${s.body}</li>`;

const buildBody = (recipe: RecipeDetail): string =>
  `<h1>${recipe.title}</h1>
  <p class="meta">${recipe.servings} servings
    ${recipe.prepTimeMin ? `· Prep: ${recipe.prepTimeMin} min` : ''}
    ${recipe.cookTimeMin ? `· Cook: ${recipe.cookTimeMin} min` : ''}</p>
  ${recipe.description ? `<p>${recipe.description}</p>` : ''}
  <h2>Ingredients</h2><ul>${recipe.ingredients.map(ingredientLine).join('')}</ul>
  <h2>Instructions</h2><ol>${recipe.instructions.map(instructionItem).join('')}</ol>`;

const buildHtml = (recipe: RecipeDetail): string =>
  `<html><head><style>${CSS}</style></head><body>${buildBody(recipe)}</body></html>`;

export const printRecipe = (recipe: RecipeDetail) =>
  Print.print({html: buildHtml(recipe)});
