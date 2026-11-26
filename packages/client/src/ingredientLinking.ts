import type {FormIngredientRow, FormInstructionRow} from './recipeFormRows.js';

/**
 * Editor ingredient → instruction linking (#643 tranche 2c).
 *
 * Stored links live on each instruction as `ingredientReferences`:
 * ordered IDs of the ingredients that step uses. In the form, an
 * ingredient's link ID is its persisted `id` when it has one; a row
 * created in the editor is stamped with its row key as its `id`
 * (see ingredientRowIdForKey — the key is a UUID minted by
 * createFormRowKey in real runtimes), so references resolve to the
 * rows inserted in the same save transaction (the server validates
 * exactly that).
 */
export const formIngredientLinkId = (
  ingredient: Pick<FormIngredientRow, 'id' | 'key'>,
): string => ingredient.id ?? ingredient.key;

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The ID a host should stamp on a newly created ingredient row: its
 * row key, when the key is a UUID (createFormRowKey mints UUIDs in
 * real runtimes). Stamping it means instruction references pointing
 * at the key resolve to the row inserted in the same save
 * transaction. Non-UUID fallback keys (environments without
 * crypto.randomUUID) yield undefined — the ingredients.id column is
 * a UUID, so a fallback key must never be sent as an ID.
 */
export const ingredientRowIdForKey = (key: string): string | undefined =>
  UUID_LIKE.test(key) ? key : undefined;

/** The ingredients a step references, in ingredient-list order. */
export const orderedIngredientReferences = (
  ingredients: FormIngredientRow[],
  references: readonly string[],
): string[] => {
  const wanted = new Set(references);
  return ingredients
    .map(ingredient => formIngredientLinkId(ingredient))
    .filter(id => wanted.has(id));
};

/**
 * Toggle one ingredient's link on a step. The result is re-ordered to
 * ingredient-list order, matching the stored-links contract (and the
 * AI pass's merge behavior in tranche 2b).
 */
export const toggleIngredientReference = (
  ingredients: FormIngredientRow[],
  references: readonly string[] | undefined,
  ingredientId: string,
): string[] => {
  const current = new Set(references ?? []);
  if (current.has(ingredientId)) {
    current.delete(ingredientId);
  } else {
    current.add(ingredientId);
  }
  return orderedIngredientReferences(ingredients, [...current]);
};

/** Set one instruction row's references (by row key); other rows pass through. */
export const withInstructionReferences = (
  instructions: FormInstructionRow[],
  instructionKey: string,
  references: string[],
): FormInstructionRow[] =>
  instructions.map(instruction =>
    instruction.key === instructionKey
      ? {...instruction, ingredientReferences: references}
      : instruction,
  );

/** Drop a removed ingredient's ID from every step's references. */
export const withoutIngredientReference = (
  instructions: FormInstructionRow[],
  ingredientId: string,
): FormInstructionRow[] =>
  instructions.map(instruction =>
    instruction.ingredientReferences?.includes(ingredientId)
      ? {
          ...instruction,
          ingredientReferences: instruction.ingredientReferences.filter(
            id => id !== ingredientId,
          ),
        }
      : instruction,
  );

/**
 * Ingredients with a name that no step references — the editor's
 * soft warning set (the approved #643 plan: warn, never block save).
 * Unnamed rows are drafts, not warnings.
 */
export const unreferencedFormIngredients = (
  ingredients: FormIngredientRow[],
  instructions: FormInstructionRow[],
): FormIngredientRow[] => {
  const referenced = new Set(
    instructions.flatMap(instruction => instruction.ingredientReferences ?? []),
  );
  return ingredients.filter(
    ingredient =>
      ingredient.name.trim().length > 0 &&
      !referenced.has(formIngredientLinkId(ingredient)),
  );
};

export type IngredientLinkProposal = {
  links: {instructionId: string; ingredientIds: string[]}[];
  unreferencedIngredientIds: string[];
};

/**
 * Apply an AI linking proposal (tranche 2b endpoint) to the form's
 * instruction rows. The endpoint is keyed by the IDs the host sent —
 * the form sends instruction row keys and ingredient link IDs — so
 * the proposal maps straight back onto rows. Unknown IDs are dropped
 * and each step's references are re-ordered to ingredient-list order;
 * steps the proposal omits keep their current references.
 */
export const applyIngredientLinkProposal = (
  ingredients: FormIngredientRow[],
  instructions: FormInstructionRow[],
  proposal: IngredientLinkProposal,
): FormInstructionRow[] => {
  const byInstructionKey = new Map(
    proposal.links.map(link => [link.instructionId, link.ingredientIds]),
  );
  return instructions.map(instruction => {
    const proposed = byInstructionKey.get(instruction.key);
    if (!proposed) {
      return instruction;
    }
    return {
      ...instruction,
      ingredientReferences: orderedIngredientReferences(ingredients, proposed),
    };
  });
};
