import {buildPrintHtml} from '@eciperay/client';
import type {RecipeDetail} from '@eciperay/types';

export const printRecipe = (recipe: RecipeDetail) => {
  const html = buildPrintHtml(recipe);
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = 'none';
  document.body.appendChild(frame);

  const cleanup = () => {
    if (frame.parentNode) {
      document.body.removeChild(frame);
    }
  };

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener('afterprint', cleanup, {once: true});
    win.focus();
    win.print();
    window.setTimeout(cleanup, 60_000);
  };

  frame.srcdoc = html;
};
