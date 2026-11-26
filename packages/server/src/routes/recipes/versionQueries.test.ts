import {makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {
  buildVersionOptions,
  getNextVersionNumber,
  insertVersion,
  updateVersion,
} from './versionQueries.js';

describe('versionQueries', () => {
  test('returns 1 when no versions exist yet', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([{max: null}]));
    await expect(
      getNextVersionNumber('recipe-uuid-1', mockQuery),
    ).resolves.toBe(1);
  });
});

// #635: tips ride the version insert/update as a JSONB array param —
// normalized (trimmed, blanks dropped, order preserved) on insert, and
// on update a provided list replaces while an omitted list passes null
// so the SQL coalesce preserves the stored tips.
describe('versionQueries tips (#635)', () => {
  const baseOptions = {
    recipeId: 'recipe-uuid-1',
    versionNumber: 1,
    title: 'Test Recipe',
    description: null,
    servings: 4,
    prepTimeMin: null,
    cookTimeMin: null,
    imageUrl: null,
    sourceUrl: null,
    createdVia: 'manual' as const,
  };

  test('insertVersion stores multiple tips in order, trimmed, blanks dropped', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([{id: 'version-uuid-1'}]));
    await insertVersion(
      {...baseOptions, tips: ['  Chill the dough  ', '', '   ', 'Rest 10 min']},
      mockQuery,
    );
    const params = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(params[9]).toBe('["Chill the dough","Rest 10 min"]');
  });

  test('insertVersion defaults to an empty list when tips are absent', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([{id: 'version-uuid-1'}]));
    await insertVersion(baseOptions, mockQuery);
    const params = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(params[9]).toBe('[]');
  });

  test('buildVersionOptions carries input tips through', () => {
    const options = buildVersionOptions({
      input: makeRecipeInput({tips: ['Tip A', 'Tip B']}),
      recipeId: 'recipe-uuid-1',
      versionNumber: 2,
      createdVia: 'manual',
    });
    expect(options.tips).toEqual(['Tip A', 'Tip B']);
  });

  test('updateVersion replaces tips when a list is provided', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([{id: 'version-uuid-1'}]));
    await updateVersion(
      'version-uuid-1',
      {...baseOptions, tips: ['New tip']},
      mockQuery,
    );
    const params = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(params[8]).toBe('["New tip"]');
  });

  test('updateVersion clears tips when an empty list is provided', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([{id: 'version-uuid-1'}]));
    await updateVersion('version-uuid-1', {...baseOptions, tips: []}, mockQuery);
    const params = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(params[8]).toBe('[]');
  });

  test('updateVersion preserves stored tips when the list is omitted', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([{id: 'version-uuid-1'}]));
    await updateVersion('version-uuid-1', baseOptions, mockQuery);
    const params = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(params[8]).toBeNull();
  });
});
