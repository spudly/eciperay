import type {Ingredient, IngredientInput} from './ingredient.js';
import type {Instruction, InstructionInput} from './instruction.js';
import type {Tag} from './tag.js';
import type {
  RecipeLifecycleStatus,
  VersionCreatedVia,
} from './recipeVersion.js';

export type RecipeVisibility = 'private' | 'unlisted' | 'public';

export type RecipeDevelopmentStatus = 'idea' | 'in_development' | 'perfected';

export type Recipe = {
  id: string;
  userId: string;
  lifecycleStatus: RecipeLifecycleStatus;
  visibility: RecipeVisibility;
  slug: string;
  contentRevision: number;
  developmentStatus: RecipeDevelopmentStatus;
  clonedFromRecipeId: string | null;
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
  createdAt: string;
  updatedAt: string;
};

export type RecipeDetail = Recipe & {
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: Tag[];
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

export type RecipeSharingUpdateInput = {
  visibility: RecipeVisibility;
  publishingConsent?: boolean;
};

export type RecipeSharingUpdateResult = RecipeDetail & {shareToken?: string};

export type RecipeShareGrantVia = 'link' | 'explicit';

/** Recipe detail safe for anonymous viewers (no owner identifiers). */
export type PublicRecipeDetail = Omit<RecipeDetail, 'userId'>;

export type PublicRecipeResponse = {
  recipe: PublicRecipeDetail;
  canonicalSlug: string;
  slugMismatch?: boolean;
};

export type CreateRecipeResult = {recipeId: string; versionId: string};
