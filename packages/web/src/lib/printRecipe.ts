import {buildPrintHtml} from '@recipoo/client';
import type {RecipeDetail} from '@recipoo/types';

export const printRecipe = (recipe: RecipeDetail) => {
  const html = buildPrintHtml(recipe);
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    document.body.removeChild(frame);
  };
  document.body.appendChild(frame);
};
