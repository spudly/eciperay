import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {createMockQuery} from '../test/mockQuery.js';

import {hashShareToken} from './shareToken.js';

import {GET_PUBLIC_RECIPE_DETAIL_SQL} from '../routes/recipes/sqlConstants.js';

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
      {id: '11111111-1111-4111-8111-111111111111', requestedSlug: 'pasta'},
      mockQuery,
    );

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      return;
    }
    expect(result.body.recipe.id).toBe('recipe-uuid-1');
    expect('userId' in result.body.recipe).toBe(false);
    expect(result.body.canonicalSlug).toBe('pasta');
    expect(result.body.slugMismatch).toBeUndefined();
  });

  test('flags a slug mismatch against the canonical slug', async () => {
    mockPublicRecipeQueries();

    const result = await loadPublicRecipe(
      {id: '11111111-1111-4111-8111-111111111111', requestedSlug: 'old-slug'},
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

  test('denies a non-uuid id as not_found without querying (#707)', async () => {
    const result = await loadPublicRecipe({id: '999999999'}, mockQuery);

    expect(result).toEqual({kind: 'denied', denial: 'not_found'});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('denies a private recipe as not_found', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({visibility: 'private'})]),
    );

    const result = await loadPublicRecipe({id: '11111111-1111-4111-8111-111111111111'}, mockQuery);

    expect(result).toEqual({kind: 'denied', denial: 'not_found'});
  });

  test('serves a private recipe to a valid share token (#534)', async () => {
    mockPublicRecipeQueries(
      makeRecipeDetailRow({
        visibility: 'private',
        slug: 'pasta',
        share_token_hash: hashShareToken('share-token'),
      }),
    );

    const result = await loadPublicRecipe(
      {id: '11111111-1111-4111-8111-111111111111', requestedSlug: 'pasta', shareToken: 'share-token'},
      mockQuery,
    );

    expect(result.kind).toBe('ok');
  });

  test('denies a private recipe with a bad share token (#534)', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeRecipeDetailRow({
          visibility: 'private',
          share_token_hash: hashShareToken('share-token'),
        }),
      ]),
    );

    const result = await loadPublicRecipe(
      {id: '11111111-1111-4111-8111-111111111111', shareToken: 'bad-token'},
      mockQuery,
    );

    expect(result).toEqual({kind: 'denied', denial: 'not_found'});
  });
});

describe('loadPublicRecipe family sharing (#617)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  const mockPrivateWithFamily = (hasFamily: boolean) => {
    const row = makeRecipeDetailRow({
      visibility: 'private',
      slug: 'secret-pasta',
      user_id: 'owner-uuid',
    });
    mockQuery.mockImplementation(((sql: string) => {
      if (sql === GET_PUBLIC_RECIPE_DETAIL_SQL) {
        return Promise.resolve(makeQueryResult([row]));
      }
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('has_family_grant')) {
        // The combined basis query: family basis only — an individual-only
        // lookup must NOT see a grant in this fixture, so reverting the
        // read check to per-recipe grants alone fails this suite.
        return Promise.resolve(
          makeQueryResult([
            {has_individual_grant: false, has_family_grant: hasFamily},
          ]),
        );
      }
      if (sql.includes('family_share_grants')) {
        return Promise.resolve(
          hasFamily ? makeQueryResult([{exists: 1}]) : makeQueryResult([]),
        );
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    return row;
  };

  test('a family grant gives read access to a private recipe', async () => {
    mockPrivateWithFamily(true);
    const result = await loadPublicRecipe(
      {id: '11111111-1111-4111-8111-111111111111', userId: 'viewer-uuid'},
      mockQuery,
    );
    expect(result.kind).toBe('ok');
  });

  test('a non-designated user gets nothing from a private recipe', async () => {
    mockPrivateWithFamily(false);
    const result = await loadPublicRecipe(
      {id: '11111111-1111-4111-8111-111111111111', userId: 'stranger-uuid'},
      mockQuery,
    );
    expect(result.kind).toBe('denied');
  });

  test('a family visit does not mint a surviving per-recipe grant', async () => {
    mockPrivateWithFamily(true);
    await loadPublicRecipe(
      {id: '11111111-1111-4111-8111-111111111111', userId: 'viewer-uuid'},
      mockQuery,
    );
    const calls = mockQuery.mock.calls.map(([sql]) => String(sql));
    expect(
      calls.some(sql => sql.includes('insert into recipe_share_grants')),
    ).toBe(false);
  });
});
