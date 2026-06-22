import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  loadPublicReadableRecipeRow,
  loadReadableRecipeRow,
} from './recipeReadAccess.js';

describe('loadReadableRecipeRow', () => {
  test('returns the recipe when the viewer can read it', async () => {
    const mockQuery = createMockQuery();
    const row = makeRecipeDetailRow({
      user_id: 'owner-uuid',
      visibility: 'public',
    });
    mockQuery.mockResolvedValue(makeQueryResult([row]));

    const result = await loadReadableRecipeRow(
      'recipe-uuid-1',
      'viewer-uuid',
      mockQuery,
    );

    expect(result).toEqual(row);
  });

  test('returns null when the viewer cannot read the recipe', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({visibility: 'private'})]),
    );

    const result = await loadReadableRecipeRow(
      'recipe-uuid-1',
      'viewer-uuid',
      mockQuery,
    );

    expect(result).toBeNull();
  });

  test('returns null when the recipe does not exist', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const result = await loadReadableRecipeRow(
      'recipe-uuid-1',
      'viewer-uuid',
      mockQuery,
    );

    expect(result).toBeNull();
  });
});

describe('loadPublicReadableRecipeRow', () => {
  test('returns ok for public recipes without authentication', async () => {
    const mockQuery = createMockQuery();
    const row = makeRecipeDetailRow({visibility: 'public'});
    mockQuery.mockResolvedValue(makeQueryResult([row]));

    const result = await loadPublicReadableRecipeRow(
      {query: {}} as never,
      'recipe-uuid-1',
      mockQuery,
    );

    expect(result).toEqual({status: 'ok', row, access: expect.any(Object)});
  });

  test('returns not_found for private recipes', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({visibility: 'private'})]),
    );

    const result = await loadPublicReadableRecipeRow(
      {query: {}} as never,
      'recipe-uuid-1',
      mockQuery,
    );

    expect(result).toEqual({status: 'not_found'});
  });

  test('returns forbidden for unlisted recipes without a token', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({visibility: 'unlisted'})]),
    );

    const result = await loadPublicReadableRecipeRow(
      {query: {}} as never,
      'recipe-uuid-1',
      mockQuery,
    );

    expect(result).toEqual({status: 'forbidden'});
  });

  test('returns not_found when the recipe does not exist', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const result = await loadPublicReadableRecipeRow(
      {query: {}} as never,
      'missing-id',
      mockQuery,
    );

    expect(result).toEqual({status: 'not_found'});
  });

  test('checks share grants when the viewer is authenticated', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([{id: 'grant-1'}]));
      }
      return Promise.resolve(
        makeQueryResult([makeRecipeDetailRow({visibility: 'unlisted'})]),
      );
    }) as typeof mockQuery);

    const result = await loadPublicReadableRecipeRow(
      {userId: 'viewer-uuid', query: {}} as never,
      'recipe-uuid-1',
      mockQuery,
    );

    expect(result.status).toBe('ok');
  });
});
