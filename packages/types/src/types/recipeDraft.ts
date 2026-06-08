import type {IngredientInput} from './ingredient.js';
import type {InstructionInput} from './instruction.js';
import type {RecipeDetail} from './recipe.js';

export type DraftStatus = 'pending' | 'approved' | 'rejected';
export type DraftTrigger = 'ai_chat' | 'ai_cleanup';

export type RecipeDraft = {
  id: string;
  recipeId: string;
  status: DraftStatus;
  snapshotJson: RecipeDetail;
  diffJson: RecipeDiff;
  trigger: DraftTrigger;
  summaryOfChanges: string;
  createdAt: string;
};

// Diff uses IngredientInput/InstructionInput (no id/recipeId) since these are
// proposed changes to be applied, not stored DB records.
export type RecipeDiff = {
  title?: string;
  description?: string | null;
  servings?: number;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  ingredients?: IngredientInput[];
  instructions?: InstructionInput[];
};
