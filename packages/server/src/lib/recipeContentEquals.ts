import type {
  IngredientInput,
  InstructionInput,
  RecipeVersionDetail,
} from '@eciperay/types';

const normalizeIngredient = (ingredient: IngredientInput) =>
  [
    ingredient.name,
    ingredient.quantity ?? null,
    ingredient.unit ?? null,
    ingredient.notes ?? null,
    ingredient.isOptional,
  ].join('|');

const normalizeInstruction = (instruction: InstructionInput) =>
  `${instruction.stepNumber}:${instruction.body}`;

const serializeIngredients = (
  ingredients: IngredientInput[] | RecipeVersionDetail['ingredients'],
) =>
  [...ingredients]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(ingredient => normalizeIngredient(ingredient))
    .join(';');

const serializeInstructions = (
  instructions: InstructionInput[] | RecipeVersionDetail['instructions'],
) =>
  [...instructions]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map(instruction => normalizeInstruction(instruction))
    .join(';');

export const recipeContentUnchanged = (
  version: Pick<RecipeVersionDetail, 'ingredients' | 'instructions'>,
  input: {ingredients: IngredientInput[]; instructions: InstructionInput[]},
): boolean =>
  serializeIngredients(version.ingredients) ===
    serializeIngredients(input.ingredients) &&
  serializeInstructions(version.instructions) ===
    serializeInstructions(input.instructions);
