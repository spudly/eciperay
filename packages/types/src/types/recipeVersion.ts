import type {Ingredient, IngredientInput} from './ingredient.js';
import type {Instruction, InstructionInput} from './instruction.js';
import type {Tag} from './tag.js';

export type RecipeStatus = 'idea' | 'evolving' | 'perfected' | 'abandoned';

export type DerivedVersionRole = 'active' | 'archived' | 'draft' | 'candidate';

export type VersionCreatedVia =
  | 'ai'
  | 'manual'
  | 'import_url'
  | 'import_image'
  | 'import_text'
  | 'import_bulk'
  | 'tweak_ai'
  | 'tweak_manual'
  | 'import_review';

export type RecipeVersionSummary = {
  id: string;
  recipeId: string;
  versionNumber: number;
  title: string;
  derivedRole: DerivedVersionRole;
  cookLogCount: number;
  childVersionCount: number;
  isEditable: boolean;
  isContentLocked: boolean;
  createdVia: VersionCreatedVia;
  changeSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecipeVersionDetail = RecipeVersionSummary & {
  status: RecipeStatus;
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
