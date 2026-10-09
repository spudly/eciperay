import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  loadAccessibleRecipe,
  loadRecipeRowIgnoringAccess,
} from './mealRecipeAccess.js';

const recipeRow = {
  id: '00000000-0000-4000-8000-000000000001',
  user_id: 'user-uuid-1',
  visibility: 'private' as const,
  share_token_hash: null,
  version_id: '00000000-0000-4000-8000-000000000002',
  servings: 4,
  title: 'Soup',
  image_url: null,
  calories: 100,
  protein_g: 10,
  carbs_g: 5,
  fat_g: 2,
  fiber_g: null,
  sugar_g: null,
  sodium_mg: null,
  prepared_weight_g: 400,
  satiety_score: 50,
  nutrition_status: 'ready',
  step_timing_status: 'ready',
};

describe('mealRecipeAccess', () => {
  test('loadAccessibleRecipe returns row for owner', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([recipeRow]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});

    const row = await loadAccessibleRecipe(
      recipeRow.id,
      'user-uuid-1',
      mockQuery,
    );
    expect(row?.title).toBe('Soup');
  });

  test('loadAccessibleRecipe hides private recipe from other users', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([recipeRow]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});

    const row = await loadAccessibleRecipe(
      recipeRow.id,
      'other-user',
      mockQuery,
    );
    expect(row).toBeNull();
  });

  test('loadRecipeRowIgnoringAccess returns null when recipe missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    await expect(
      loadRecipeRowIgnoringAccess('missing', mockQuery),
    ).resolves.toBeNull();
  });

  test('loadRecipeRowIgnoringAccess returns row regardless of access', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([recipeRow]));

    const row = await loadRecipeRowIgnoringAccess(recipeRow.id, mockQuery);
    expect(row?.id).toBe(recipeRow.id);
  });
});
