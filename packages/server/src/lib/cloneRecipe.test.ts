import {
  GET_PUBLIC_RECIPE_DETAIL_SQL,
  GET_RECIPE_DETAIL_SQL,
} from '../routes/recipes/sqlConstants.js';
import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {makeTag} from '../test/fixtures/tag.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  cloneRecipeForUser,
  FILTER_CLONABLE_TAG_IDS_SQL,
  filterClonableTagIds,
  recipeDetailToCloneInput,
} from './cloneRecipe.js';
import {RecipeNotFoundError} from './saveRecipeFromInput.js';

const mockQuery = createMockQuery();

describe('cloneRecipe helpers', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns empty tag ids when source has no tags', async () => {
    const ids = await filterClonableTagIds([], 'user-uuid-1', mockQuery);
    expect(ids).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('filters tags to those owned by the cloner or preset', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([{id: 'tag-owned'}, {id: 'tag-preset'}]),
    );
    const ids = await filterClonableTagIds(
      ['tag-owned', 'tag-other', 'tag-preset'],
      'user-uuid-1',
      mockQuery,
    );
    expect(ids).toEqual(['tag-owned', 'tag-preset']);
    expect(mockQuery).toHaveBeenCalledWith(FILTER_CLONABLE_TAG_IDS_SQL, [
      ['tag-owned', 'tag-other', 'tag-preset'],
      'user-uuid-1',
    ]);
  });

  test('maps recipe detail into clone input without lineage ids', () => {
    const recipe = makeRecipeDetail({
      tags: [makeTag({id: 'tag-1'}), makeTag({id: 'tag-2'})],
    });
    const input = recipeDetailToCloneInput(recipe, ['tag-1']);
    expect(input.title).toBe(recipe.title);
    expect(input.tagIds).toEqual(['tag-1']);
    expect(input.ingredients[0]).not.toHaveProperty('id');
    expect(input.instructions[0]).not.toHaveProperty('id');
  });

  test('throws when cloned recipe detail is missing after create', async () => {
    const source = makeRecipeDetailRow({
      visibility: 'public',
      user_id: 'owner-uuid',
      tags: [],
    });
    mockQuery.mockImplementation(((sql: string) => {
      if (sql === GET_PUBLIC_RECIPE_DETAIL_SQL) {
        return Promise.resolve(makeQueryResult([source]));
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql === FILTER_CLONABLE_TAG_IDS_SQL) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('insert into recipes')) {
        return Promise.resolve(makeQueryResult([{id: 'cloned-recipe-id'}]));
      }
      if (sql.includes('insert into recipe_versions')) {
        return Promise.resolve(makeQueryResult([{id: 'version-id'}]));
      }
      if (sql === GET_RECIPE_DETAIL_SQL) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    await expect(
      cloneRecipeForUser('recipe-uuid-1', 'user-uuid-1', undefined, mockQuery),
    ).rejects.toBeInstanceOf(RecipeNotFoundError);
  });

  test('throws when cloned lineage insert returns no id', async () => {
    const source = makeRecipeDetailRow({
      visibility: 'public',
      user_id: 'owner-uuid',
      tags: [],
    });
    mockQuery.mockImplementation(((sql: string) => {
      if (sql === GET_PUBLIC_RECIPE_DETAIL_SQL) {
        return Promise.resolve(makeQueryResult([source]));
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql === FILTER_CLONABLE_TAG_IDS_SQL) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('insert into recipes')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    await expect(
      cloneRecipeForUser('recipe-uuid-1', 'user-uuid-1', undefined, mockQuery),
    ).rejects.toThrow('Failed to create cloned recipe');
  });

  test('throws when cloned version insert returns no id', async () => {
    const source = makeRecipeDetailRow({
      visibility: 'public',
      user_id: 'owner-uuid',
      tags: [],
    });
    let versionInsertCount = 0;
    mockQuery.mockImplementation(((sql: string) => {
      if (sql === GET_PUBLIC_RECIPE_DETAIL_SQL) {
        return Promise.resolve(makeQueryResult([source]));
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql === FILTER_CLONABLE_TAG_IDS_SQL) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('insert into recipes')) {
        return Promise.resolve(makeQueryResult([{id: 'cloned-recipe-id'}]));
      }
      if (sql.includes('insert into recipe_versions')) {
        versionInsertCount += 1;
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    await expect(
      cloneRecipeForUser('recipe-uuid-1', 'user-uuid-1', undefined, mockQuery),
    ).rejects.toThrow('Failed to create cloned recipe version');
    expect(versionInsertCount).toBe(1);
  });
});
