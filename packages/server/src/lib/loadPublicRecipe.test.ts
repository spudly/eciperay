import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {createMockQuery} from '../test/mockQuery.js';

import {loadPublicRecipe} from './loadPublicRecipe.js';

const mockQuery = createMockQuery();

const mockPublicRecipeQueries = (
  row = makeRecipeDetailRow({
    visibility: 'public',
    slug: 'pasta',
    user_id: 'owner-uuid',
  }),
) => {
  mockQuery.mockImplementation(((sql: string) => {
    if (sql.includes('recipe_ratings rr')) {
      return Promise.resolve(makeQueryResult([]));
    }
    return Promise.resolve(makeQueryResult([row]));
  }) as typeof mockQuery);
};

describe('loadPublicRecipe', () => {
  test('returns the public recipe body for an anonymous load', async () => {
    mockPublicRecipeQueries();

    const result = await loadPublicRecipe(
      {id: 'recipe-uuid-1', requestedSlug: 'pasta'},
      mockQuery,
    );

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      return;
    }
    expect(result.body.recipe.id).toBe('recipe-uuid-1');
    expect(result.body.recipe.userId).toBeUndefined();
    expect(result.body.canonicalSlug).toBe('pasta');
    expect(result.body.slugMismatch).toBeUndefined();
  });

  test('flags a slug mismatch against the canonical slug', async () => {
    mockPublicRecipeQueries();

    const result = await loadPublicRecipe(
      {id: 'recipe-uuid-1', requestedSlug: 'old-slug'},
      mockQuery,
    );

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      return;
    }
    expect(result.body.slugMismatch).toBe(true);
  });

  test('denies a missing recipe as not_found', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const result = await loadPublicRecipe({id: 'missing-id'}, mockQuery);

    expect(result).toEqual({kind: 'denied', denial: 'not_found'});
  });

  test('denies a private recipe as not_found', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({visibility: 'private'})]),
    );

    const result = await loadPublicRecipe({id: 'recipe-uuid-1'}, mockQuery);

    expect(result).toEqual({kind: 'denied', denial: 'not_found'});
  });
});
