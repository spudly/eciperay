import {buildShareText} from '@recipoo/client';
import {Share} from 'react-native';
import type {RecipeDetail} from '@recipoo/types';

export const shareRecipe = (recipe: RecipeDetail) =>
  Share.share({
    title: recipe.title,
    message: buildShareText(recipe),
    url: recipe.sourceUrl ?? undefined,
  });
