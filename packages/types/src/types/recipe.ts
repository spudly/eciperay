import type {Ingredient, IngredientInput} from './ingredient.js';
import type {Instruction, InstructionInput} from './instruction.js';
import type {NutritionInfo, RecipeNutritionSummary} from './nutrition.js';
import type {Tag} from './tag.js';
import type {
  RecipeCommunityRating,
  RecipeRatingSummary,
  RecipeStarRating,
} from './recipeRating.js';
import type {VersionCreatedVia} from './recipeVersion.js';

export type RecipeVisibility = 'private' | 'unlisted' | 'public';

export type RecipeProvenanceSource =
  | 'original'
  | 'ai_generated'
  | 'import_url'
  | 'import_cookbook_photo'
  | 'import_text'
  | 'import_bulk'
  | 'shared_clone'
  | 'other';

export type RecipeProvenance = {
  source: RecipeProvenanceSource;
  /** Source URL for import_url, cookbook identification for
   * import_cookbook_photo, free text for other; null otherwise. */
  detail: string | null;
};

export type RecipeListSort =
  | 'newest'
  | 'rating'
  | 'satiety'
  | 'calories'
  | 'relevance';
export type RecipeListSortDir = 'asc' | 'desc';

export type Recipe = {
  id: string;
  userId: string;
  visibility: RecipeVisibility;
  slug: string;
  contentRevision: number;
  clonedFromRecipeId: string | null;
  starRating: RecipeStarRating | null;
  versionId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  servings: number;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  createdVia: VersionCreatedVia;
  /** Recipe-level provenance (#609); null only for legacy rows the backfill could not classify. Absent on surfaces that do not select the provenance columns. */
  provenance?: RecipeProvenance | null;
  createdAt: string;
  updatedAt: string;
  sharedVia?: RecipeSharedVia;
} & RecipeNutritionSummary;

export type RecipeDetail = Recipe & {
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: Tag[];
  nutrition: NutritionInfo | null;
  communityRating: RecipeCommunityRating | null;
};

export type RecipeInput = {
  title: string;
  description?: string | null;
  servings: number;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  /** Authored cooking tips (#635), in display order; omit to leave the stored tips unchanged on update. */
  tips?: string[];
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
  tagIds: string[];
};

export type RecipeMetadataInput = {
  title: string;
  description?: string | null;
  servings: number;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  tagIds: string[];
};

/**
 * The subset of recipe fields `update_recipe` may change. A field left
 * `undefined` is preserved from the stored recipe; a field set to `null` (where
 * nullable) clears it.
 */
export type RecipeUpdatePatch = {
  title?: string;
  description?: string | null;
  servings?: number;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  sourceUrl?: string | null;
  /** Version tips (#635); providing the list replaces the stored one. */
  tips?: string[];
  ingredients?: IngredientInput[];
  instructions?: InstructionInput[];
  tagIds?: string[];
  /**
   * The version a content edit applies to (#410). Required when
   * ingredients/instructions change; naming a non-active version routes the
   * whole patch to that version. Not itself an update field.
   */
  versionId?: string;
  /**
   * With a version-path edit, make the edited version active. Defaults to
   * false: the edited version stays a draft. Not itself an update field.
   */
  activate?: boolean;
};

export type RecipeSharingUpdateInput = {
  visibility: RecipeVisibility;
  publishingConsent?: boolean;
};

export type RecipeSharingUpdateResult = RecipeDetail & {shareToken?: string};

export type RecipeShareGrantVia = 'link' | 'explicit';

/** Set only on Shared With Me list items: how the recipe was shared. */
export type RecipeSharedVia = 'individual' | 'family';

/**
 * Recipe detail safe for anonymous viewers (no owner identifiers).
 * `authorDisplayName` is the owner's display name when they allow it to be
 * shown on public recipes, otherwise null.
 */
export type PublicRecipeDetail = Omit<RecipeDetail, 'userId'> & {
  authorDisplayName: string | null;
};

export type PublicRecipeDiscoverySort = RecipeListSort;

/** Summary card for public recipe browse/search results. */
export type PublicRecipeDiscoveryItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  servings: number;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  imageUrl: string | null;
  visibility: 'public';
  authorDisplayName: string | null;
  updatedAt: string;
  tags: Tag[];
  communityRating: RecipeCommunityRating | null;
} & RecipeNutritionSummary;

export type PublicRecipeResponse = RecipeRatingSummary & {
  recipe: PublicRecipeDetail;
  canonicalSlug: string;
  slugMismatch?: boolean;
};

export type CreateRecipeResult = {recipeId: string; versionId: string};
