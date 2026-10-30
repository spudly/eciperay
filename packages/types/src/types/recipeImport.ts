import type {IngredientInput} from './ingredient.js';
import type {InstructionInput} from './instruction.js';

export type RecipeImport = {
  title: string;
  description: string | null;
  servings: number | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  sourceUrl: string | null;
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
};

/**
 * An existing library recipe that an import duplicates: same normalized
 * title and same normalized ingredient list (issue #296).
 */
export type DuplicateRecipeMatch = {
  recipeId: string;
  title: string;
};
