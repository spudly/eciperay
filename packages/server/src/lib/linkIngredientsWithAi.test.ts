import {nockAnthropicMessage} from '../test/mockNockAnthropic.js';

import {
  linkIngredientsWithAi,
  mergeAiIngredientLinks,
} from './linkIngredientsWithAi.js';

const ingredients = [
  {id: 'ing-onion', name: 'yellow onion'},
  {id: 'ing-garlic', name: 'garlic'},
  {id: 'ing-carrot', name: 'carrots'},
  {id: 'ing-parsley', name: 'fresh parsley'},
];
const instructions = [
  {id: 'step-1', body: 'Chop the onion and garlic.'},
  {id: 'step-2', body: 'Add the vegetables and simmer.'},
  {id: 'step-3', body: 'Preheat the oven to 200C.'},
];

describe('mergeAiIngredientLinks', () => {
  it('unions the AI map with the matcher seed and orders by ingredient list', () => {
    const seed = new Map<string, string[]>([
      ['step-1', ['ing-onion', 'ing-garlic']],
      ['step-2', []],
      ['step-3', []],
    ]);
    const proposal = mergeAiIngredientLinks(ingredients, instructions, seed, [
      // AI catches the collective reference in step 2, out of list order.
      {instructionId: 'step-2', ingredientIds: ['ing-carrot', 'ing-onion']},
      {instructionId: 'step-3', ingredientIds: []},
    ]);
    expect(proposal.links).toEqual([
      {instructionId: 'step-1', ingredientIds: ['ing-onion', 'ing-garlic']},
      {instructionId: 'step-2', ingredientIds: ['ing-onion', 'ing-carrot']},
      {instructionId: 'step-3', ingredientIds: []},
    ]);
    expect(proposal.unreferencedIngredientIds).toEqual(['ing-parsley']);
  });

  it('drops unknown instruction/ingredient ids and dedupes', () => {
    const seed = new Map<string, string[]>([['step-1', ['ing-onion']]]);
    const proposal = mergeAiIngredientLinks(ingredients, instructions, seed, [
      {
        instructionId: 'step-1',
        ingredientIds: ['ing-garlic', 'ing-garlic', 'ing-ghost'],
      },
      {instructionId: 'step-ghost', ingredientIds: ['ing-parsley']},
    ]);
    expect(proposal.links[0]).toEqual({
      instructionId: 'step-1',
      ingredientIds: ['ing-onion', 'ing-garlic'],
    });
    // The ghost step's parsley link must not count as a reference.
    expect(proposal.unreferencedIngredientIds).toContain('ing-parsley');
  });

  it('falls back to the seed for instructions the AI omits', () => {
    const seed = new Map<string, string[]>([
      ['step-1', ['ing-onion', 'ing-garlic']],
    ]);
    const proposal = mergeAiIngredientLinks(
      ingredients,
      instructions,
      seed,
      [],
    );
    expect(proposal.links[0]?.ingredientIds).toEqual([
      'ing-onion',
      'ing-garlic',
    ]);
  });
});

describe('linkIngredientsWithAi', () => {
  it('returns the merged proposal from the Claude response', async () => {
    nockAnthropicMessage(
      JSON.stringify({
        links: [
          {instructionId: 'step-1', ingredientIds: ['ing-onion', 'ing-garlic']},
          {
            instructionId: 'step-2',
            ingredientIds: ['ing-onion', 'ing-garlic', 'ing-carrot'],
          },
          {instructionId: 'step-3', ingredientIds: []},
        ],
      }),
    );
    const proposal = await linkIngredientsWithAi(ingredients, instructions);
    expect(proposal.links[1]).toEqual({
      instructionId: 'step-2',
      ingredientIds: ['ing-onion', 'ing-garlic', 'ing-carrot'],
    });
    expect(proposal.unreferencedIngredientIds).toEqual(['ing-parsley']);
  });
});
