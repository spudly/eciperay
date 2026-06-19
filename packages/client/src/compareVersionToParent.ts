import type {
  IngredientInput,
  InstructionInput,
  RecipeVersionDetail,
  RecipeVersionInput,
} from '@eciperay/types';

export type VersionScalarField =
  | 'title'
  | 'description'
  | 'servings'
  | 'prepTimeMin'
  | 'cookTimeMin'
  | 'imageUrl'
  | 'sourceUrl';

export type VersionDiff = {
  changedScalars: VersionScalarField[];
  ingredientsChanged: boolean;
  instructionsChanged: boolean;
  tagsChanged: boolean;
};

const normalizeIngredient = (ingredient: {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  isOptional?: boolean;
}) =>
  [
    ingredient.name,
    ingredient.quantity ?? null,
    ingredient.unit ?? null,
    ingredient.notes ?? null,
    ingredient.isOptional === true,
  ].join('|');

const normalizeInstruction = (instruction: {
  stepNumber: number;
  body: string;
}) => `${instruction.stepNumber}:${instruction.body}`;

const collectChangedScalars = (
  parent: RecipeVersionDetail,
  current: RecipeVersionInput,
): VersionScalarField[] => {
  const checks: [VersionScalarField, boolean][] = [
    ['title', parent.title !== current.title],
    ['description', (parent.description ?? '') !== (current.description ?? '')],
    ['servings', parent.servings !== current.servings],
    ['prepTimeMin', parent.prepTimeMin !== (current.prepTimeMin ?? null)],
    ['cookTimeMin', parent.cookTimeMin !== (current.cookTimeMin ?? null)],
    ['imageUrl', (parent.imageUrl ?? '') !== (current.imageUrl ?? '')],
    ['sourceUrl', (parent.sourceUrl ?? '') !== (current.sourceUrl ?? '')],
  ];
  return checks.filter(([, changed]) => changed).map(([field]) => field);
};

const serializeIngredients = (
  ingredients:
    | RecipeVersionDetail['ingredients']
    | RecipeVersionInput['ingredients'],
) =>
  [...ingredients]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(normalizeIngredient)
    .join(';');

const serializeInstructions = (
  instructions:
    | RecipeVersionDetail['instructions']
    | RecipeVersionInput['instructions'],
) =>
  [...instructions]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map(normalizeInstruction)
    .join(';');

export const compareVersionToParent = (
  parent: RecipeVersionDetail,
  current: RecipeVersionInput,
): VersionDiff => {
  const changedScalars = collectChangedScalars(parent, current);
  const parentIngredients = serializeIngredients(parent.ingredients);
  const currentIngredients = serializeIngredients(current.ingredients);
  const parentInstructions = serializeInstructions(parent.instructions);
  const currentInstructions = serializeInstructions(current.instructions);
  const parentTagIds = parent.tags
    .map(tag => tag.id)
    .sort()
    .join(',');
  const currentTagIds = [...current.tagIds].sort().join(',');

  return {
    changedScalars,
    ingredientsChanged: parentIngredients !== currentIngredients,
    instructionsChanged: parentInstructions !== currentInstructions,
    tagsChanged: parentTagIds !== currentTagIds,
  };
};

export const revertVersionScalar = (
  parent: RecipeVersionDetail,
  field: VersionScalarField,
): string | number | null => {
  switch (field) {
    case 'title': {
      return parent.title;
    }
    case 'description': {
      return parent.description;
    }
    case 'servings': {
      return parent.servings;
    }
    case 'prepTimeMin': {
      return parent.prepTimeMin;
    }
    case 'cookTimeMin': {
      return parent.cookTimeMin;
    }
    case 'imageUrl': {
      return parent.imageUrl;
    }
    case 'sourceUrl': {
      return parent.sourceUrl;
    }
  }
};

export const parentIngredientsInput = (
  parent: RecipeVersionDetail,
): IngredientInput[] =>
  parent.ingredients.map(ingredient => ({
    sortOrder: ingredient.sortOrder,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    notes: ingredient.notes,
    isOptional: ingredient.isOptional,
  }));

export const parentInstructionsInput = (
  parent: RecipeVersionDetail,
): InstructionInput[] =>
  parent.instructions.map(instruction => ({
    stepNumber: instruction.stepNumber,
    body: instruction.body,
  }));

export const parentTagIds = (parent: RecipeVersionDetail): string[] =>
  parent.tags.map(tag => tag.id);
