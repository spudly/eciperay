import type {RecipeDetail} from '@recipoo/types';

import {makeIngredient} from './ingredient.js';
import {makeInstruction} from './instruction.js';
import {makeTag} from './tag.js';
import {makeRecipeDetail} from './recipe.js';

export const makeRecipeDetailRow = (
  overrides: Partial<RecipeDetail> & {
    user_id?: string;
    prep_time_min?: number | null;
    cook_time_min?: number | null;
    image_url?: string | null;
    star_rating?: 1 | 2 | 3 | 4 | 5 | null;
    source_url?: string | null;
    created_at?: string;
    updated_at?: string;
  } = {},
) => {
  const detail = makeRecipeDetail(overrides);
  return {
    id: detail.id,
    user_id: overrides.user_id ?? detail.userId,
    title: detail.title,
    description: detail.description,
    servings: detail.servings,
    prep_time_min: overrides.prep_time_min ?? detail.prepTimeMin,
    cook_time_min: overrides.cook_time_min ?? detail.cookTimeMin,
    image_url: overrides.image_url ?? detail.imageUrl,
    star_rating: overrides.star_rating ?? detail.starRating,
    source_url: overrides.source_url ?? detail.sourceUrl,
    created_at: overrides.created_at ?? detail.createdAt,
    updated_at: overrides.updated_at ?? detail.updatedAt,
    ingredients: overrides.ingredients ?? [makeIngredient()],
    instructions: overrides.instructions ?? [makeInstruction()],
    tags: overrides.tags ?? [makeTag()],
  };
};
