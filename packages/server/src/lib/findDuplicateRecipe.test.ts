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

  test('treats non-breaking spaces as whitespace', () => {
    // JS `\s`/trim cover U+00A0; the SQL pre-filter translates the same
    // set to ASCII spaces so both sides agree under any DB collation.
    expect(normalizeForDuplicateMatch('Pasta Salad')).toBe('pasta salad');
    expect(normalizeForDuplicateMatch(' Pasta Salad ')).toBe('pasta salad');
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

describe('legacy (pre-split) ingredient normalization (#309)', () => {
  test('an unsplit legacy row fingerprints like its split re-import', () => {
    expect(
      normalizeIngredientForDuplicateMatch(
        ingredient({name: '200g pasta', quantity: null, unit: null}),
      ),
    ).toBe(normalizeIngredientForDuplicateMatch(ingredient()));
    expect(
      normalizeIngredientForDuplicateMatch(
        ingredient({name: '200g pasta', quantity: null, unit: null}),
      ),
    ).toBe('pasta|200|g||required');
  });

  test('an amount-only legacy prefix splits too', () => {
    expect(
      normalizeIngredientForDuplicateMatch(
        ingredient({name: '2 eggs', quantity: null, unit: null}),
      ),
    ).toBe('eggs|2|||required');
  });

  test('a ranged legacy amount keeps the range text as notes, like the split import', () => {
    const legacy = normalizeIngredientForDuplicateMatch(
      ingredient({name: '1-2 tbsp olive oil', quantity: null, unit: null}),
    );
    const split = normalizeIngredientForDuplicateMatch(
      ingredient({name: 'olive oil', quantity: 1, unit: 'tbsp', notes: '1-2'}),
    );
    expect(legacy).toBe(split);
    expect(legacy).toBe('olive oil|1|tbsp|1-2|required');
  });

  test('a legacy row’s own notes win over the parser’s notes', () => {
    expect(
      normalizeIngredientForDuplicateMatch(
        ingredient({
          name: '1-2 tbsp olive oil',
          quantity: null,
          unit: null,
          notes: 'good quality',
        }),
      ),
    ).toBe('olive oil|1|tbsp|good quality|required');
  });

  test('a legacy name with no parseable amount prefix fingerprints unchanged', () => {
    expect(
      normalizeIngredientForDuplicateMatch(
        ingredient({
          name: 'Salt and pepper to taste',
          quantity: null,
          unit: null,
        }),
      ),
    ).toBe('salt and pepper to taste||||required');
  });

  test('already-normalized rows are never re-parsed', () => {
    // Quantity present: the name is taken as stored, even if it still
    // contains an amount-looking prefix.
    expect(
      normalizeIngredientForDuplicateMatch(
        ingredient({name: '200g pasta', quantity: 100, unit: 'g'}),
      ),
    ).toBe('200g pasta|100|g||required');
    // Unit present with a null quantity: likewise untouched.
    expect(
      normalizeIngredientForDuplicateMatch(
        ingredient({name: '200g pasta', quantity: null, unit: 'g'}),
      ),
    ).toBe('200g pasta||g||required');
  });

  test('list fingerprints match across the legacy/split shapes', () => {
    const legacy = ingredientListFingerprint([
      ingredient({name: '200g pasta', quantity: null, unit: null}),
      ingredient({name: '5 basil', quantity: null, unit: null}),
    ]);
    const split = ingredientListFingerprint([
      ingredient(),
      ingredient({name: 'basil', quantity: 5, unit: null}),
    ]);
    expect(legacy).toBe(split);
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
    // Candidates are scoped to the importing user's own library, with the
    // normalized title applied as a SQL pre-filter.
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      'pasted pasta',
    ]);
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

  test('matches a candidate whose title uses non-breaking spaces', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        candidateRow({
          title: 'Pasted Pasta',
          ingredients: [
            {
              name: 'pasta',
              quantity: 200,
              unit: 'g',
              notes: null,
              isOptional: false,
            },
            {
              name: 'basil',
              quantity: 5,
              unit: null,
              notes: null,
              isOptional: false,
            },
          ],
        }),
      ]),
    );
    await expect(
      findDuplicateRecipe('user-uuid-1', input, mockQuery),
    ).resolves.toEqual({recipeId: 'recipe-uuid-9', title: 'Pasted Pasta'});
    // The SQL pre-filter must be able to return this row under any DB
    // collation: it translates the JS `\s` non-ASCII set (incl. U+00A0)
    // to ASCII spaces instead of relying on PostgreSQL `\s` alone.
    const sql = String(mockQuery.mock.calls[0]?.[0]);
    expect(sql).toContain('translate');
    expect(sql).toContain('\\u00a0');
  });

  test('SQL pre-filter admits raw titles containing non-ASCII characters', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([candidateRow()]));
    await findDuplicateRecipe('user-uuid-1', input, mockQuery);
    // PostgreSQL lower() and JS toLowerCase() can disagree on non-ASCII
    // characters, so alongside the normalized-equality branch for ASCII
    // titles the pre-filter must admit any raw title containing a
    // non-ASCII character and let the exact JS comparison decide.
    const sql = String(mockQuery.mock.calls[0]?.[0]);
    expect(sql).toContain('= $2');
    expect(sql).toContain("or rv.title ~ '[^\\x00-\\x7F]'");
  });

  test('matches a pre-split legacy candidate against the split re-import (#309)', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        candidateRow({
          ingredients: [
            {
              name: '200g pasta',
              quantity: null,
              unit: null,
              notes: null,
              isOptional: false,
            },
            {
              name: '5 basil',
              quantity: null,
              unit: null,
              notes: null,
              isOptional: false,
            },
          ],
        }),
      ]),
    );
    await expect(
      findDuplicateRecipe('user-uuid-1', input, mockQuery),
    ).resolves.toEqual({recipeId: 'recipe-uuid-9', title: 'Pasted Pasta'});
  });

  test('does not match a legacy candidate whose amount differs from the re-import (#309)', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        candidateRow({
          ingredients: [
            {
              name: '250g pasta',
              quantity: null,
              unit: null,
              notes: null,
              isOptional: false,
            },
            {
              name: '5 basil',
              quantity: null,
              unit: null,
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

  test('still matches a legacy candidate with no parseable amount prefix exactly (#309)', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        candidateRow({
          ingredients: [
            {
              name: 'Salt and pepper to taste',
              quantity: null,
              unit: null,
              notes: null,
              isOptional: false,
            },
          ],
        }),
      ]),
    );
    await expect(
      findDuplicateRecipe(
        'user-uuid-1',
        {
          title: 'Pasted Pasta',
          ingredients: [
            ingredient({
              name: 'Salt and pepper to taste',
              quantity: null,
              unit: null,
            }),
          ],
        },
        mockQuery,
      ),
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
