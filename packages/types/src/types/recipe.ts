import type {Ingredient, IngredientInput} from './ingredient.js';
import type {Instruction, InstructionInput} from './instruction.js';
import type {Tag} from './tag.js';
import type {
  RecipeLifecycleStatus,
  VersionCreatedVia,
} from './recipeVersion.js';

export type Recipe = {
  id: string;
  userId: string;
  lifecycleStatus: RecipeLifecycleStatus;
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

export type CreateRecipeResult = {recipeId: string; versionId: string};
