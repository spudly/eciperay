import {buildShareText} from '@eciperay/client';
import {Share} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

export const shareRecipe = (recipe: RecipeDetail) =>
  Share.share({
    title: recipe.title,
    message: buildShareText(recipe),
    url: recipe.sourceUrl ?? undefined,
  });
