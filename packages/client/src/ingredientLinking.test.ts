import {
  applyIngredientLinkProposal,
  formIngredientLinkId,
  ingredientRowIdForKey,
  toggleIngredientReference,
  unreferencedFormIngredients,
  withInstructionReferences,
  withoutIngredientReference,
} from './ingredientLinking.js';
import type {FormIngredientRow, FormInstructionRow} from './recipeFormRows.js';

const ingredient = (
  overrides: Partial<FormIngredientRow>,
): FormIngredientRow => ({
  key: 'k-flour',
  sortOrder: 0,
  name: 'Flour',
  quantity: null,
  unit: null,
  notes: null,
  isOptional: false,
  ...overrides,
});

const ingredients: FormIngredientRow[] = [
  ingredient({key: 'k-flour', id: 'i-flour', name: 'Flour', sortOrder: 0}),
  ingredient({key: 'k-sugar', name: 'Sugar', sortOrder: 1}),
  ingredient({key: 'k-salt', id: 'i-salt', name: 'Salt', sortOrder: 2}),
  ingredient({key: 'k-draft', name: '  ', sortOrder: 3}),
];

const instruction = (
  overrides: Partial<FormInstructionRow>,
): FormInstructionRow => ({
  key: 's-1',
  stepNumber: 1,
  body: 'Mix',
  ingredientReferences: [],
  ...overrides,
});

describe('formIngredientLinkId', () => {
  test('prefers the persisted id, falls back to the row key', () => {
    expect(formIngredientLinkId(ingredients[0])).toBe('i-flour');
    expect(formIngredientLinkId(ingredients[1])).toBe('k-sugar');
  });
});

describe('ingredientRowIdForKey', () => {
  test('returns UUID keys, rejects fallback keys', () => {
    expect(
      ingredientRowIdForKey('123e4567-e89b-42d3-a456-426614174000'),
    ).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(ingredientRowIdForKey('form-row-3')).toBeUndefined();
    expect(ingredientRowIdForKey('i-flour')).toBeUndefined();
  });
});

describe('toggleIngredientReference', () => {
  test('adds a link, ordered by ingredient-list order', () => {
    expect(
      toggleIngredientReference(ingredients, ['i-salt'], 'i-flour'),
    ).toEqual(['i-flour', 'i-salt']);
  });

  test('removes an existing link', () => {
    expect(
      toggleIngredientReference(ingredients, ['i-flour', 'i-salt'], 'i-flour'),
    ).toEqual(['i-salt']);
  });

  test('treats undefined references as empty', () => {
    expect(toggleIngredientReference(ingredients, undefined, 'k-sugar')).toEqual(
      ['k-sugar'],
    );
  });

  test('drops references to ingredients no longer in the list', () => {
    expect(
      toggleIngredientReference(ingredients, ['gone-id'], 'i-salt'),
    ).toEqual(['i-salt']);
  });
});

describe('withInstructionReferences / withoutIngredientReference', () => {
  const instructions = [
    instruction({key: 's-1', ingredientReferences: ['i-flour']}),
    instruction({key: 's-2', stepNumber: 2, ingredientReferences: ['i-flour']}),
  ];

  test('sets references on the targeted row only', () => {
    const next = withInstructionReferences(instructions, 's-2', ['i-salt']);
    expect(next[0].ingredientReferences).toEqual(['i-flour']);
    expect(next[1].ingredientReferences).toEqual(['i-salt']);
  });

  test('removing an ingredient strips its id from every step', () => {
    const next = withoutIngredientReference(instructions, 'i-flour');
    expect(next.map(row => row.ingredientReferences)).toEqual([[], []]);
  });
});

describe('unreferencedFormIngredients', () => {
  test('lists named ingredients no step references', () => {
    const instructions = [
      instruction({ingredientReferences: ['i-flour', 'k-sugar']}),
    ];
    expect(
      unreferencedFormIngredients(ingredients, instructions).map(row => row.name),
    ).toEqual(['Salt']);
  });
});

describe('applyIngredientLinkProposal', () => {
  test('applies proposed links keyed by row key, ordered and validated', () => {
    const instructions = [
      instruction({key: 's-1'}),
      instruction({key: 's-2', stepNumber: 2, ingredientReferences: ['i-salt']}),
    ];
    const next = applyIngredientLinkProposal(ingredients, instructions, {
      links: [
        {instructionId: 's-1', ingredientIds: ['i-salt', 'unknown', 'i-flour']},
      ],
      unreferencedIngredientIds: ['k-sugar'],
    });
    expect(next[0].ingredientReferences).toEqual(['i-flour', 'i-salt']);
    // Steps the proposal omits keep their current references.
    expect(next[1].ingredientReferences).toEqual(['i-salt']);
  });
});
