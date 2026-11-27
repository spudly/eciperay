/* eslint-disable max-lines -- recipe row mappers share lineage + version field shapes */
import type {
  PublicRecipeDetail,
  RecipeDetail,
  RecipeProvenanceSource,
  RecipeVersionDetail,
  RecipeVersionSummary,
  RecipeVisibility,
  VersionCreatedVia,
} from '@eciperay/types';

import {deriveVersionRole} from './deriveVersionRole.js';
import {
  isVersionContentLocked,
  isVersionEditable,
} from './isVersionEditable.js';
import {
  mapCommunityRatingFromRow,
  mapNutritionInfoFromDetailRow,
  mapNutritionSummary,
  type CommunityRatingColumns,
  type NutritionColumns,
} from './mapNutritionFromRow.js';

type RecipeDetailRow = {
  id: string;
  user_id: string;
  visibility: RecipeVisibility;
  slug: string;
  share_token_hash: string | null;
  content_revision: number;
  cloned_from_recipe_id: string | null;
  provenance_source?: RecipeProvenanceSource | null;
  provenance_detail?: string | null;
  star_rating: RecipeDetail['starRating'];
  active_version_id: string;
  version_id: string;
  version_number: number;
  title: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  image_url: string | null;
  source_url: string | null;
  /** Active version's tips (#635); mapped onto RecipeDetail for display (tranche 2) and read by clone/export. */
  tips?: string[] | null;
  created_via: VersionCreatedVia;
  created_at: string;
  updated_at: string;
  ingredients: RecipeDetail['ingredients'];
  instructions: RecipeDetail['instructions'];
  tags: RecipeDetail['tags'];
  author_display_name?: string | null;
} & NutritionColumns &
  Partial<CommunityRatingColumns>;

export type RecipeListRow = {
  id: string;
  visibility: RecipeVisibility;
  slug: string;
  content_revision: number;
  cloned_from_recipe_id: string | null;
  star_rating: RecipeDetail['starRating'];
  active_version_id: string;
  version_id: string;
  version_number: number;
  title: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  image_url: string | null;
  source_url: string | null;
  created_via: VersionCreatedVia;
  created_at: string;
  updated_at: string;
  shared_via?: RecipeDetail['sharedVia'];
  tags: RecipeDetail['tags'];
} & NutritionColumns &
  CommunityRatingColumns;

type VersionDetailRow = {
  version_id: string;
  recipe_id: string;
  version_number: number;
  title: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  image_url: string | null;
  source_url: string | null;
  /** Version tips (#635); absent/null on rows from before the column existed. */
  tips?: string[] | null;
  created_via: VersionCreatedVia;
  change_summary: string | null;
  derived_from_version_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  active_version_id: string;
  active_version_number: number;
  ingredients: RecipeDetail['ingredients'];
  instructions: RecipeDetail['instructions'];
  tags: RecipeDetail['tags'];
  cook_log_count: number;
  child_version_count: number;
};

type VersionSummaryRow = {
  id: string;
  recipe_id: string;
  version_number: number;
  title: string;
  created_via: VersionCreatedVia;
  change_summary: string | null;
  created_at: string;
  updated_at: string;
  active_version_id: string;
  active_version_number: number;
  cook_log_count: number;
  child_version_count: number;
};

export const mapRowToRecipeListItem = (row: RecipeListRow): RecipeDetail => ({
  ...(row.shared_via ? {sharedVia: row.shared_via} : {}),
  id: row.id,
  userId: '',
  visibility: row.visibility,
  slug: row.slug,
  contentRevision: row.content_revision,
  clonedFromRecipeId: row.cloned_from_recipe_id,
  starRating: row.star_rating ?? null,
  versionId: row.version_id,
  versionNumber: row.version_number,
  title: row.title,
  description: row.description,
  servings: row.servings,
  prepTimeMin: row.prep_time_min,
  cookTimeMin: row.cook_time_min,
  imageUrl: row.image_url,
  sourceUrl: row.source_url,
  createdVia: row.created_via,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...mapNutritionSummary(row),
  nutrition: mapNutritionInfoFromDetailRow(row),
  communityRating: mapCommunityRatingFromRow(row),
  ingredients: [],
  instructions: [],
  tags: row.tags,
});

export type PublicRecipeDiscoveryRow = {
  id: string;
  slug: string;
  visibility: RecipeVisibility;
  title: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  image_url: string | null;
  updated_at: string;
  author_display_name: string | null;
  tags: RecipeDetail['tags'];
} & NutritionColumns &
  CommunityRatingColumns;

export const mapRowToPublicRecipeDiscoveryItem = (
  row: PublicRecipeDiscoveryRow,
) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description,
  servings: row.servings,
  prepTimeMin: row.prep_time_min,
  cookTimeMin: row.cook_time_min,
  imageUrl: row.image_url,
  visibility: 'public' as const,
  authorDisplayName: row.author_display_name,
  updatedAt: row.updated_at,
  tags: row.tags,
  ...mapNutritionSummary(row),
  communityRating: mapCommunityRatingFromRow(row),
});

export const mapRowToRecipeDetail = (row: RecipeDetailRow): RecipeDetail => ({
  id: row.id,
  userId: row.user_id,
  visibility: row.visibility,
  slug: row.slug,
  contentRevision: row.content_revision,
  clonedFromRecipeId: row.cloned_from_recipe_id,
  starRating: row.star_rating ?? null,
  versionId: row.version_id,
  versionNumber: row.version_number,
  title: row.title,
  description: row.description,
  servings: row.servings,
  prepTimeMin: row.prep_time_min,
  cookTimeMin: row.cook_time_min,
  imageUrl: row.image_url,
  sourceUrl: row.source_url,
  createdVia: row.created_via,
  ...(row.provenance_source
    ? {
        provenance: {
          source: row.provenance_source,
          detail: row.provenance_detail ?? null,
        },
      }
    : {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...mapNutritionSummary(row),
  nutrition: mapNutritionInfoFromDetailRow(row),
  communityRating: mapCommunityRatingFromRow(row),
  tips: row.tips ?? [],
  ingredients: row.ingredients,
  instructions: row.instructions,
  tags: row.tags,
});

export const mapRowToPublicRecipeDetail = (
  row: RecipeDetailRow,
): PublicRecipeDetail => {
  const {userId, ...recipe} = mapRowToRecipeDetail(row);
  void userId;
  return {...recipe, authorDisplayName: row.author_display_name ?? null};
};

export const mapRowToVersionSummary = (
  row: VersionSummaryRow,
): RecipeVersionSummary => {
  const derivedRole = deriveVersionRole(
    {id: row.id, versionNumber: row.version_number},
    {id: row.active_version_id, versionNumber: row.active_version_number},
    row.cook_log_count,
  );
  return {
    id: row.id,
    recipeId: row.recipe_id,
    versionNumber: row.version_number,
    title: row.title,
    derivedRole,
    cookLogCount: row.cook_log_count,
    childVersionCount: row.child_version_count,
    isEditable: isVersionEditable({
      derivedRole,
      cookLogCount: row.cook_log_count,
      childVersionCount: row.child_version_count,
    }),
    isContentLocked: isVersionContentLocked({
      derivedRole,
      cookLogCount: row.cook_log_count,
      childVersionCount: row.child_version_count,
    }),
    createdVia: row.created_via,
    changeSummary: row.change_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapRowToVersionDetail = (
  row: VersionDetailRow,
): RecipeVersionDetail => ({
  ...mapRowToVersionSummary({
    id: row.version_id,
    recipe_id: row.recipe_id,
    version_number: row.version_number,
    title: row.title,
    created_via: row.created_via,
    change_summary: row.change_summary,
    created_at: row.created_at,
    updated_at: row.updated_at,
    active_version_id: row.active_version_id,
    active_version_number: row.active_version_number,
    cook_log_count: row.cook_log_count,
    child_version_count: row.child_version_count,
    }),
  description: row.description,
  servings: row.servings,
  prepTimeMin: row.prep_time_min,
  cookTimeMin: row.cook_time_min,
  imageUrl: row.image_url,
  sourceUrl: row.source_url,
  tips: row.tips ?? [],
  derivedFromVersionId: row.derived_from_version_id,
  ingredients: row.ingredients,
  instructions: row.instructions,
  tags: row.tags,
});
