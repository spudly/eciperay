import type {Ingredient, IngredientInput} from './ingredient.js';
import type {Instruction, InstructionInput} from './instruction.js';
import type {NutritionInfo, RecipeNutritionSummary} from './nutrition.js';
import type {Tag} from './tag.js';
import type {
  RecipeCommunityRating,
  RecipeRatingSummary,
  RecipeStarRating,
} from './recipeRating.js';
import type {RecipeStatus, VersionCreatedVia} from './recipeVersion.js';

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

export type RecipeListSort = 'newest' | 'rating' | 'satiety' | 'calories';
export type RecipeListSortDir = 'asc' | 'desc';

export type Recipe = {
  id: string;
  userId: string;
  status: RecipeStatus;
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
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
  tagIds: string[];
  status?: RecipeStatus;
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
  status?: RecipeStatus;
};

export type RecipeSharingUpdateInput = {
  visibility: RecipeVisibility;
  publishingConsent?: boolean;
};

export type RecipeSharingUpdateResult = RecipeDetail & {shareToken?: string};

export type RecipeShareGrantVia = 'link' | 'explicit';

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
