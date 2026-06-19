import type {
  CookLog,
  Ingredient,
  Instruction,
  RecipeDetail,
  RecipeVersionDetail,
} from '@eciperay/types';

const toIngredientSummary = (i: Ingredient) => ({
  sortOrder: i.sortOrder,
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

const toVersionSummary = (version: RecipeVersionDetail) => ({
  title: version.title,
  description: version.description,
  servings: version.servings,
  prepTimeMin: version.prepTimeMin,
  cookTimeMin: version.cookTimeMin,
  ingredients: version.ingredients.map(toIngredientSummary),
  instructions: version.instructions.map(toInstructionSummary),
});

const toCookLogSummary = (log: CookLog) => ({
  cookedAt: log.cookedAt,
  authorStarRating: log.authorStarRating,
  notes: log.notes,
});

export const buildRecipeContext = (recipe: RecipeDetail): string =>
  JSON.stringify(toRecipeSummary(recipe), null, 2);

export const buildTweakContext = (
  version: RecipeVersionDetail,
  cookLogs: CookLog[],
): string =>
  JSON.stringify(
    {
      recipe: toVersionSummary(version),
      cookLogs: cookLogs.map(toCookLogSummary),
    },
    null,
    2,
  );
