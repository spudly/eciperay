import type {Ingredient, IngredientInput} from './ingredient.js';
import type {Instruction, InstructionInput} from './instruction.js';
import type {Tag} from './tag.js';

export type Recipe = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  servings: number;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  imageUrl: string | null;
  starRating: 1 | 2 | 3 | 4 | 5 | null;
  sourceUrl: string | null;
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
  starRating?: 1 | 2 | 3 | 4 | 5 | null;
  sourceUrl?: string | null;
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
  tagIds: string[];
};
