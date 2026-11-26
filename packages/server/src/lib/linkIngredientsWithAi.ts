/**
 * AI ingredient → instruction linking pass (#643 tranche 2b).
 *
 * Layer 2 of the #643 linking design: the deterministic matcher
 * (tranche 2a) produces a baseline link map from explicit text mentions;
 * this pass asks Claude to complete it, catching collective and pronoun
 * references ("add the vegetables", "stir in the sauce") that text
 * matching cannot. The final proposal is the UNION of the matcher seed
 * and the validated AI output — an explicit mention the matcher found is
 * never dropped because the model omitted it.
 *
 * AI output is never trusted raw: instruction and ingredient IDs the
 * model returns that are not in the input are dropped, duplicates are
 * removed, and each step's ingredient IDs are re-ordered to
 * ingredient-list order. Instructions the model omits fall back to their
 * matcher seed. The result is a PROPOSAL only — stored links remain the
 * source of truth and are written only when the author accepts/saves
 * (the editor correction UI is a later tranche-2 slice).
 */

import {anthropic, HAIKU} from './anthropic.js';
import {
  matchInstructionIngredients,
  type MatchableIngredient,
  type MatchableInstruction,
} from './matchInstructionIngredients.js';
import {AiIngredientLinksResponseSchema, parseAiJson} from './schemas.js';

export type IngredientLinkProposal = {
  /** Per instruction, in instruction order: the proposed ingredient IDs. */
  links: {instructionId: string; ingredientIds: string[]}[];
  /** Ingredient IDs no instruction references, in ingredient-list order. */
  unreferencedIngredientIds: string[];
};

type AiLink = {instructionId: string; ingredientIds: string[]};

/**
 * Merge a validated AI link map with the deterministic matcher seed.
 * Pure — unit-tested without a model call.
 */
export function mergeAiIngredientLinks(
  ingredients: MatchableIngredient[],
  instructions: MatchableInstruction[],
  seed: Map<string, string[]>,
  aiLinks: AiLink[],
): IngredientLinkProposal {
  const ingredientOrder = new Map(
    ingredients.map((ingredient, index) => [ingredient.id, index]),
  );
  const instructionIds = new Set(instructions.map((i) => i.id));
  const aiByInstruction = new Map<string, string[]>();
  for (const link of aiLinks) {
    if (!instructionIds.has(link.instructionId)) continue;
    aiByInstruction.set(link.instructionId, link.ingredientIds);
  }

  const referenced = new Set<string>();
  const links = instructions.map((instruction) => {
    const merged = new Set<string>(seed.get(instruction.id) ?? []);
    for (const id of aiByInstruction.get(instruction.id) ?? []) {
      if (ingredientOrder.has(id)) merged.add(id);
    }
    const ingredientIds = [...merged].sort(
      (a, b) => (ingredientOrder.get(a) ?? 0) - (ingredientOrder.get(b) ?? 0),
    );
    for (const id of ingredientIds) referenced.add(id);
    return {instructionId: instruction.id, ingredientIds};
  });

  return {
    links,
    unreferencedIngredientIds: ingredients
      .map((ingredient) => ingredient.id)
      .filter((id) => !referenced.has(id)),
  };
}

const buildPrompt = (
  ingredients: MatchableIngredient[],
  instructions: MatchableInstruction[],
  seed: Map<string, string[]>,
): string => {
  const ingredientLines = ingredients
    .map((ingredient) => `- id=${ingredient.id} name=${ingredient.name}`)
    .join('\n');
  const stepLines = instructions
    .map((instruction, index) => {
      const seeded = seed.get(instruction.id) ?? [];
      const seedText =
        seeded.length > 0 ? ` [already matched: ${seeded.join(', ')}]` : '';
      return `Step ${index + 1} id=${instruction.id}: ${instruction.body}${seedText}`;
    })
    .join('\n');
  return `Link each recipe step to the ingredients it uses.

Ingredients (use ONLY these ids):
${ingredientLines}

Steps:
${stepLines}

Rules:
- For every step, list the ids of ALL ingredients that step uses, including ingredients referred to collectively or by pronoun ("add the vegetables", "stir in the sauce", "drain them").
- An ingredient may be linked from several steps (prepared in one, used in another).
- Keep the already-matched ids for each step; add any the text matching missed.
- A step that uses no ingredient (preheat, boil water) gets an empty list.
- Return ONLY JSON, no markdown: {"links": [{"instructionId": string, "ingredientIds": [string]}]} covering every step id exactly once.`;
};

export const linkIngredientsWithAi = async (
  ingredients: MatchableIngredient[],
  instructions: MatchableInstruction[],
): Promise<IngredientLinkProposal> => {
  const seed = matchInstructionIngredients(ingredients, instructions);
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: buildPrompt(
          ingredients,
          instructions,
          seed.referencesByInstructionId,
        ),
      },
    ],
  });
  const content = response.content[0];
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  const parsed = parseAiJson(AiIngredientLinksResponseSchema, content.text);
  return mergeAiIngredientLinks(
    ingredients,
    instructions,
    seed.referencesByInstructionId,
    parsed.links,
  );
};
