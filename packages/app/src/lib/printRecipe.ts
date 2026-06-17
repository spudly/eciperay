import {buildPrintHtml} from '@eciperay/client';
import Print from 'react-native-print';
import type {RecipeDetail} from '@eciperay/types';

export const printRecipe = (recipe: RecipeDetail) =>
  Print.print({html: buildPrintHtml(recipe)});
