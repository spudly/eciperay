/**
 * Deterministic ingredient → instruction matcher (#643 tranche 2a).
 *
 * Produces the baseline link map between a recipe version's flat
 * ingredient list and its instructions: for each instruction, the IDs of
 * the ingredients its text mentions. This is layer 1 of the #643 linking
 * design — the AI linking pass (tranche 2b) is seeded by these matches
 * and catches collective/pronoun references ("add the vegetables") that
 * text matching cannot. Stored links remain the source of truth; this
 * matcher only proposes.
 *
 * Matching is deliberately conservative:
 * - Both sides are normalized (lowercase, punctuation stripped,
 *   whitespace collapsed) before comparison.
 * - Ingredient names are reduced to their significant tokens: leading
 *   preparation words ("finely chopped", "minced", …) are dropped so
 *   "finely chopped onion" matches instruction text saying "onion".
 * - Singular/plural tolerant: a token matches its singular or plural
 *   form ("onion" ↔ "onions", "tomato" ↔ "tomatoes").
 * - An ingredient matches an instruction when ALL of its significant
 *   name tokens appear in the instruction text (so "olive oil" does not
 *   match a step that only mentions "oil" for a different ingredient,
 *   and "chicken breast" does not match a step about "chicken stock"
 *   unless "breast" also appears).
 */

export type MatchableIngredient = { id: string; name: string };
export type MatchableInstruction = { id: string; body: string };

export type InstructionIngredientMatches = {
  /** instructionId → matched ingredient IDs, in ingredient-list order. */
  referencesByInstructionId: Map<string, string[]>;
  /** Ingredient IDs no instruction matched, in ingredient-list order. */
  unreferencedIngredientIds: string[];
};

/** Preparation words that describe how an ingredient is prepared, not what it is. */
const PREPARATION_WORDS = new Set([
  'beaten',
  'chopped',
  'coarsely',
  'crushed',
  'cubed',
  'diced',
  'divided',
  'finely',
  'fresh',
  'freshly',
  'grated',
  'halved',
  'julienned',
  'melted',
  'minced',
  'peeled',
  'quartered',
  'roughly',
  'shredded',
  'sliced',
  'softened',
  'thinly',
  'torn',
  'trimmed',
  'washed',
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized === '' ? [] : normalized.split(' ');
}

/** Singular form of a token, for plural-tolerant comparison. */
function singularize(token: string): string {
  if (token.endsWith('oes') || token.endsWith('ches') || token.endsWith('shes')) {
    return token.slice(0, -2);
  }
  if (token.endsWith('ies') && token.length > 3) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 1) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenForms(token: string): Set<string> {
  return new Set([token, singularize(token)]);
}

/** Significant tokens of an ingredient name: preparation words removed. */
export function ingredientNameTokens(name: string): string[] {
  const tokens = tokenize(name).filter((token) => !PREPARATION_WORDS.has(token));
  // A name that is only preparation words (degenerate) falls back to all tokens.
  return tokens.length > 0 ? tokens : tokenize(name);
}

export function matchInstructionIngredients(
  ingredients: MatchableIngredient[],
  instructions: MatchableInstruction[],
): InstructionIngredientMatches {
  const prepared = ingredients.map((ingredient) => ({
    id: ingredient.id,
    tokenForms: ingredientNameTokens(ingredient.name).map(tokenForms),
  }));

  const referencesByInstructionId = new Map<string, string[]>();
  const referenced = new Set<string>();

  for (const instruction of instructions) {
    const bodyForms = new Set<string>();
    for (const token of tokenize(instruction.body)) {
      for (const form of tokenForms(token)) bodyForms.add(form);
    }
    const matched: string[] = [];
    for (const ingredient of prepared) {
      if (ingredient.tokenForms.length === 0) continue;
      const allPresent = ingredient.tokenForms.every((forms) =>
        [...forms].some((form) => bodyForms.has(form)),
      );
      if (allPresent) {
        matched.push(ingredient.id);
        referenced.add(ingredient.id);
      }
    }
    referencesByInstructionId.set(instruction.id, matched);
  }

  return {
    referencesByInstructionId,
    unreferencedIngredientIds: ingredients
      .map((ingredient) => ingredient.id)
      .filter((id) => !referenced.has(id)),
  };
}
