import type {RecipeVersionInput} from '@eciperay/types';

const isProposedRecipeRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasRequiredRecipeFields = (candidate: Record<string, unknown>): boolean =>
  typeof candidate['title'] === 'string' &&
  Array.isArray(candidate['ingredients']) &&
  Array.isArray(candidate['instructions']);

const recipeInputFromCandidate = (
  candidate: Record<string, unknown>,
): RecipeVersionInput => ({
  title: candidate['title'] as string,
  description: (candidate['description'] as string | null | undefined) ?? null,
  servings:
    typeof candidate['servings'] === 'number' ? candidate['servings'] : 1,
  prepTimeMin: (candidate['prepTimeMin'] as number | null | undefined) ?? null,
  cookTimeMin: (candidate['cookTimeMin'] as number | null | undefined) ?? null,
  imageUrl: (candidate['imageUrl'] as string | null | undefined) ?? null,
  sourceUrl: (candidate['sourceUrl'] as string | null | undefined) ?? null,
  ingredients: candidate['ingredients'] as RecipeVersionInput['ingredients'],
  instructions: candidate['instructions'] as RecipeVersionInput['instructions'],
  tagIds: Array.isArray(candidate['tagIds'])
    ? (candidate['tagIds'] as string[])
    : [],
});

export const parseProposedRecipe = (
  value?: Record<string, unknown> | null,
): RecipeVersionInput | null => {
  if (!isProposedRecipeRecord(value)) {
    return null;
  }
  if (!hasRequiredRecipeFields(value)) {
    return null;
  }
  return recipeInputFromCandidate(value);
};

export const sortedPreviewIngredients = (input: RecipeVersionInput) =>
  [...input.ingredients].sort((a, b) => a.sortOrder - b.sortOrder);

export const sortedPreviewInstructions = (input: RecipeVersionInput) =>
  [...input.instructions].sort((a, b) => a.stepNumber - b.stepNumber);
