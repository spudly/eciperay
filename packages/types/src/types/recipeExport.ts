import type {IngredientInput} from './ingredient.js';
import type {InstructionInput} from './instruction.js';

export type RecipeExportImage = {base64: string; contentType: string};

export type RecipeExportTag = {name: string; color?: string};

export type RecipeExportRecord = {
  title: string;
  description: string | null;
  servings: number;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  starRating: 1 | 2 | 3 | 4 | 5 | null;
  sourceUrl: string | null;
  tags: RecipeExportTag[];
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
  image?: RecipeExportImage;
};

export type RecipeExportBundle = {
  formatVersion: 1;
  exportedAt: string;
  recipes: RecipeExportRecord[];
};

export type BulkImportError = {index: number; title: string; message: string};

export type BulkImportResult = {
  created: {id: string; title: string}[];
  errors: BulkImportError[];
};
