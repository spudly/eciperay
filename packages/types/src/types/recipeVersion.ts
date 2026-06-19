import type {Ingredient, IngredientInput} from './ingredient.js';
import type {Instruction, InstructionInput} from './instruction.js';
import type {Tag} from './tag.js';

export type RecipeLifecycleStatus =
  | 'idea'
  | 'evolving'
  | 'perfected'
  | 'abandoned';

export type DerivedVersionRole = 'active' | 'archived' | 'draft' | 'candidate';

export type VersionCreatedVia =
  | 'ai'
  | 'manual'
  | 'import_url'
  | 'import_image'
  | 'import_text'
  | 'import_bulk'
  | 'tweak_ai'
  | 'tweak_manual';

export type RecipeVersionSummary = {
  id: string;
  recipeId: string;
  versionNumber: number;
  title: string;
  derivedRole: DerivedVersionRole;
  cookLogCount: number;
  createdVia: VersionCreatedVia;
  changeSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecipeVersionDetail = RecipeVersionSummary & {
  description: string | null;
  servings: number;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  derivedFromVersionId: string | null;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: Tag[];
};

export type RecipeVersionInput = {
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
