import {buildPrintHtml} from '@recipoo/client';
import Print from 'react-native-print';
import type {RecipeDetail} from '@recipoo/types';

export const printRecipe = (recipe: RecipeDetail) =>
  Print.print({html: buildPrintHtml(recipe)});
