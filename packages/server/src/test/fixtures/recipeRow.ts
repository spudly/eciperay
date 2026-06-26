import type {RecipeDetail} from '@eciperay/types';

import {makeIngredient} from './ingredient.js';
import {makeInstruction} from './instruction.js';
import {makeTag} from './tag.js';
import {makeRecipeDetail} from './recipe.js';

export const makeRecipeDetailRow = (
  overrides: Partial<RecipeDetail> & {
    user_id?: string;
    status?: RecipeDetail['status'];
    visibility?: RecipeDetail['visibility'];
    slug?: string;
    share_token_hash?: string | null;
    content_revision?: number;
    cloned_from_recipe_id?: string | null;
    star_rating?: RecipeDetail['starRating'];
    active_version_id?: string;
    version_id?: string;
    version_number?: number;
    prep_time_min?: number | null;
    cook_time_min?: number | null;
    image_url?: string | null;
    source_url?: string | null;
    created_via?: RecipeDetail['createdVia'];
    created_at?: string;
    updated_at?: string;
  } = {},
) => {
  const detail = makeRecipeDetail(overrides);
  return {
    id: detail.id,
    user_id: overrides.user_id ?? detail.userId,
    status: overrides.status ?? detail.status,
    visibility: overrides.visibility ?? detail.visibility,
    slug: overrides.slug ?? detail.slug,
    share_token_hash: overrides.share_token_hash ?? null,
    content_revision: overrides.content_revision ?? detail.contentRevision,
    cloned_from_recipe_id:
      overrides.cloned_from_recipe_id ?? detail.clonedFromRecipeId,
    star_rating: overrides.star_rating ?? detail.starRating,
    active_version_id: overrides.active_version_id ?? detail.versionId,
    version_id: overrides.version_id ?? detail.versionId,
    version_number: overrides.version_number ?? detail.versionNumber,
    title: detail.title,
    description: detail.description,
    servings: detail.servings,
    prep_time_min: overrides.prep_time_min ?? detail.prepTimeMin,
    cook_time_min: overrides.cook_time_min ?? detail.cookTimeMin,
    image_url: overrides.image_url ?? detail.imageUrl,
    source_url: overrides.source_url ?? detail.sourceUrl,
    created_via: overrides.created_via ?? detail.createdVia,
    created_at: overrides.created_at ?? detail.updatedAt,
    updated_at: overrides.updated_at ?? detail.updatedAt,
    ingredients: overrides.ingredients ?? [makeIngredient()],
    instructions: overrides.instructions ?? [makeInstruction()],
    tags: overrides.tags ?? [makeTag()],
  };
};
