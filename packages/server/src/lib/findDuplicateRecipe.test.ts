import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';
import {
  findDuplicateRecipe,
  ingredientListFingerprint,
  normalizeForDuplicateMatch,
  normalizeIngredientForDuplicateMatch,
} from './findDuplicateRecipe.js';

const ingredient = (
  overrides: Partial<{
    name: string;
    quantity: number | null;
    unit: string | null;
    notes: string | null;
    isOptional: boolean;
  }> = {},
) => ({
  sortOrder: 0,
  name: 'pasta',
  quantity: 200,
  unit: 'g',
  notes: null,
  isOptional: false,
  ...overrides,
});

const input = {
  title: 'Pasted Pasta',
  ingredients: [
    ingredient(),
    ingredient({name: 'basil', quantity: 5, unit: null}),
  ],
};

const candidateRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'recipe-uuid-9',
  title: 'Pasted Pasta',
  ingredients: [
    {name: 'pasta', quantity: 200, unit: 'g', notes: null, isOptional: false},
    {name: 'basil', quantity: 5, unit: null, notes: null, isOptional: false},
  ],
  ...overrides,
});

describe('normalizeForDuplicateMatch', () => {
  test('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeForDuplicateMatch('  Pasted \n  PASTA ')).toBe(
      'pasted pasta',
    );
  });
});

describe('normalizeIngredientForDuplicateMatch', () => {
  test('includes name, quantity, unit, notes, and optionality', () => {
    expect(
      normalizeIngredientForDuplicateMatch(
        ingredient({name: ' Basil ', notes: ' Torn '}),
      ),
    ).toBe('basil|200|g|torn|required');
    expect(
      normalizeIngredientForDuplicateMatch(
        ingredient({quantity: null, unit: null, isOptional: true}),
      ),
    ).toBe('pasta||||optional');
  });
});

describe('ingredientListFingerprint', () => {
  test('is insensitive to ingredient order and name casing', () => {
    const a = ingredientListFingerprint([
      ingredient(),
      ingredient({name: 'BASIL', quantity: 5}),
    ]);
    const b = ingredientListFingerprint([
      ingredient({name: 'basil', quantity: 5}),
      ingredient(),
    ]);
    expect(a).toBe(b);
  });

  test('differs when a quantity differs', () => {
    const a = ingredientListFingerprint([ingredient()]);
    const b = ingredientListFingerprint([ingredient({quantity: 250})]);
    expect(a).not.toBe(b);
  });
});

describe('findDuplicateRecipe', () => {
  test('returns the match when title and ingredients match', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([candidateRow()]));
    await expect(
      findDuplicateRecipe('user-uuid-1', input, mockQuery),
    ).resolves.toEqual({recipeId: 'recipe-uuid-9', title: 'Pasted Pasta'});
    // Candidates are scoped to the importing user's own library.
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['user-uuid-1']);
  });

  test('matches despite title casing/whitespace and ingredient order', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        candidateRow({
          title: '  pasted   PASTA',
          ingredients: [
            {
              name: 'Basil',
              quantity: 5,
              unit: null,
              notes: null,
              isOptional: false,
            },
            {
              name: 'pasta',
              quantity: 200,
              unit: 'g',
              notes: null,
              isOptional: false,
            },
          ],
        }),
      ]),
    );
    await expect(
      findDuplicateRecipe('user-uuid-1', input, mockQuery),
    ).resolves.toEqual({recipeId: 'recipe-uuid-9', title: '  pasted   PASTA'});
  });

  test('returns null when only the title matches', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        candidateRow({
          ingredients: [
            {
              name: 'rice',
              quantity: 200,
              unit: 'g',
              notes: null,
              isOptional: false,
            },
          ],
        }),
      ]),
    );
    await expect(
      findDuplicateRecipe('user-uuid-1', input, mockQuery),
    ).resolves.toBeNull();
  });

  test('returns null when only the ingredients match', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([candidateRow({title: 'A Different Dish'})]),
    );
    await expect(
      findDuplicateRecipe('user-uuid-1', input, mockQuery),
    ).resolves.toBeNull();
  });

  test('returns the oldest match when several recipes duplicate', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        candidateRow({id: 'recipe-uuid-old'}),
        candidateRow({id: 'recipe-uuid-new'}),
      ]),
    );
    await expect(
      findDuplicateRecipe('user-uuid-1', input, mockQuery),
    ).resolves.toEqual({recipeId: 'recipe-uuid-old', title: 'Pasted Pasta'});
  });

  test('skips malformed candidate rows', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        candidateRow({id: 'recipe-uuid-bad', title: 42}),
        candidateRow({id: 'recipe-uuid-weird', ingredients: 'not-an-array'}),
        candidateRow(),
      ]),
    );
    await expect(
      findDuplicateRecipe('user-uuid-1', input, mockQuery),
    ).resolves.toEqual({recipeId: 'recipe-uuid-9', title: 'Pasted Pasta'});
  });

  test('returns null for an empty library', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await expect(
      findDuplicateRecipe('user-uuid-1', input, mockQuery),
    ).resolves.toBeNull();
  });
});
