import type {RecipeVersionDetail, RecipeVersionSummary} from '@eciperay/types';

import {makeIngredient} from './ingredient.js';
import {makeInstruction} from './instruction.js';
import {makeTag} from './tag.js';

type VersionRowOverrides = Partial<RecipeVersionSummary> & {
  recipe_id?: string;
  version_number?: number;
  created_via?: RecipeVersionSummary['createdVia'];
  change_summary?: string | null;
  created_at?: string;
  updated_at?: string;
  active_version_id?: string;
  active_version_number?: number;
  cook_log_count?: number;
  child_version_count?: number;
  version_id?: string;
  description?: string | null;
  servings?: number;
  prep_time_min?: number | null;
  cook_time_min?: number | null;
  image_url?: string | null;
  source_url?: string | null;
  derived_from_version_id?: string | null;
  user_id?: string;
  status?: RecipeVersionDetail['derivedRole'] extends never
    ? never
    : import('@eciperay/types').RecipeLifecycleStatus;
  ingredients?: RecipeVersionDetail['ingredients'];
  instructions?: RecipeVersionDetail['instructions'];
  tags?: RecipeVersionDetail['tags'];
};

export const makeVersionSummaryRow = (overrides: VersionRowOverrides = {}) => ({
  id: overrides.id ?? 'version-uuid-1',
  recipe_id: overrides.recipeId ?? overrides.recipe_id ?? 'recipe-uuid-1',
  version_number: overrides.versionNumber ?? overrides.version_number ?? 1,
  title: overrides.title ?? 'Test Recipe',
  created_via: overrides.createdVia ?? overrides.created_via ?? 'manual',
  change_summary: overrides.changeSummary ?? overrides.change_summary ?? null,
  created_at:
    overrides.createdAt ?? overrides.created_at ?? '2024-01-01T00:00:00.000Z',
  updated_at:
    overrides.updatedAt ?? overrides.updated_at ?? '2024-01-01T00:00:00.000Z',
  active_version_id: overrides.active_version_id ?? 'version-uuid-1',
  active_version_number: overrides.active_version_number ?? 1,
  cook_log_count: overrides.cookLogCount ?? overrides.cook_log_count ?? 0,
  child_version_count:
    overrides.childVersionCount ?? overrides.child_version_count ?? 0,
  status: overrides.status ?? 'evolving',
});

export const makeVersionDetailRow = (overrides: VersionRowOverrides = {}) => {
  const summary = makeVersionSummaryRow(overrides);
  return {
    version_id: overrides.version_id ?? summary.id,
    recipe_id: summary.recipe_id,
    version_number: summary.version_number,
    title: summary.title,
    description: overrides.description ?? 'A test recipe',
    servings: overrides.servings ?? 4,
    prep_time_min: overrides.prep_time_min ?? 15,
    cook_time_min: overrides.cook_time_min ?? 30,
    image_url: overrides.image_url ?? null,
    source_url: overrides.source_url ?? null,
    created_via: summary.created_via,
    change_summary: summary.change_summary,
    derived_from_version_id: overrides.derived_from_version_id ?? null,
    created_at: summary.created_at,
    updated_at: summary.updated_at,
    user_id: overrides.user_id ?? 'user-uuid-1',
    status: overrides.status ?? summary.status,
    active_version_id: summary.active_version_id,
    active_version_number: summary.active_version_number,
    ingredients: overrides.ingredients ?? [makeIngredient()],
    instructions: overrides.instructions ?? [makeInstruction()],
    tags: overrides.tags ?? [makeTag()],
    cook_log_count: summary.cook_log_count,
    child_version_count: summary.child_version_count,
  };
};
