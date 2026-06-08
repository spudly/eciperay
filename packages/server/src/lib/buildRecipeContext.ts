import type {RecipeDetail, Ingredient, Instruction} from '@recipoo/types';

const toIngredientSummary = (i: Ingredient) => ({
  name: i.name,
  quantity: i.quantity,
  unit: i.unit,
  notes: i.notes,
  isOptional: i.isOptional,
});

const toInstructionSummary = (s: Instruction) => ({
  stepNumber: s.stepNumber,
  body: s.body,
});

const toRecipeSummary = (recipe: RecipeDetail) => ({
  title: recipe.title,
  description: recipe.description,
  servings: recipe.servings,
  prepTimeMin: recipe.prepTimeMin,
  cookTimeMin: recipe.cookTimeMin,
  ingredients: recipe.ingredients.map(toIngredientSummary),
  instructions: recipe.instructions.map(toInstructionSummary),
});

export const buildRecipeContext = (recipe: RecipeDetail): string =>
  JSON.stringify(toRecipeSummary(recipe), null, 2);
