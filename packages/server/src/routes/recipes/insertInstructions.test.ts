import {insertInstructions} from './queries.js';
import {cloneVersionChildren} from './versionQueries.js';

type RecordedCall = {sql: string; params: unknown[]};

// Minimal QueryFn stand-in: records calls and answers the ingredient
// existence check from a fixed set of IDs belonging to the version.
const makeQueryFn = (ingredientIds: string[]) => {
  const calls: RecordedCall[] = [];
  const queryFn = async (sql: string, params: unknown[] = []) => {
    calls.push({sql, params});
    if (sql.startsWith('select id from ingredients')) {
      const wanted = params[1] as string[];
      return ingredientIds
        .filter(id => wanted.includes(id))
        .map(id => ({id}));
    }
    return [];
  };
  return {calls, queryFn: queryFn as never};
};

describe('insertInstructions ingredient references (#643)', () => {
  test('stores the references as a JSON array param', async () => {
    const {calls, queryFn} = makeQueryFn(['ing-1', 'ing-2']);
    await insertInstructions(
      'version-1',
      [
        {
          stepNumber: 1,
          body: 'Mix the flour and sugar.',
          ingredientReferences: ['ing-1', 'ing-2'],
        },
      ],
      queryFn,
    );
    const insert = calls.find(c => c.sql.startsWith('insert into instructions'));
    expect(insert?.params).toEqual([
      'version-1',
      1,
      'Mix the flour and sugar.',
      '["ing-1","ing-2"]',
    ]);
  });

  test('defaults to an empty reference list when omitted', async () => {
    const {calls, queryFn} = makeQueryFn([]);
    await insertInstructions(
      'version-1',
      [{stepNumber: 1, body: 'Preheat the oven.'}],
      queryFn,
    );
    const insert = calls.find(c => c.sql.startsWith('insert into instructions'));
    expect(insert?.params[3]).toBe('[]');
  });

  test('rejects a reference to an ingredient outside the version', async () => {
    const {calls, queryFn} = makeQueryFn(['ing-1']);
    await expect(
      insertInstructions(
        'version-1',
        [
          {
            stepNumber: 1,
            body: 'Add the saffron.',
            ingredientReferences: ['ing-999'],
          },
        ],
        queryFn,
      ),
    ).rejects.toThrow('unknown ingredient ids: ing-999');
    expect(
      calls.some(c => c.sql.startsWith('insert into instructions')),
    ).toBe(false);
  });
});

describe('cloneVersionChildren ingredient references (#643)', () => {
  test('carries ingredient IDs and instruction references into the clone', async () => {
    const {calls, queryFn} = makeQueryFn([]);
    await cloneVersionChildren('source-1', 'target-1', queryFn);
    const ingredientInsert = calls.find(c =>
      c.sql.startsWith('insert into ingredients'),
    );
    expect(ingredientInsert?.sql).toContain('(id, recipe_version_id');
    expect(ingredientInsert?.sql).toContain('select id, $2');
    const instructionInsert = calls.find(c =>
      c.sql.startsWith('insert into instructions'),
    );
    expect(instructionInsert?.sql).toContain('ingredient_references');
  });
});
