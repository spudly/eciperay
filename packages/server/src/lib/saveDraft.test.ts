import {makeRecipeDiff, makeRecipeDraft} from '../test/fixtures/recipeDraft.js';
import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {saveDraft} from './saveDraft.js';

describe('saveDraft', () => {
  test('calls queryFn with correct SQL and returns the inserted row', async () => {
    const draft = makeRecipeDraft();
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([draft]));
    const snapshot = makeRecipeDetail();
    const diff = makeRecipeDiff();

    const result = await saveDraft(
      {
        recipeId: 'recipe-uuid-1',
        snapshot,
        diff,
        trigger: 'ai_chat',
        summary: 'Changed title',
      },
      mockQuery,
    );

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result.rows[0]).toEqual(draft);
  });

  test('passes trigger and summary in the query params', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([makeRecipeDraft()]));
    await saveDraft(
      {
        recipeId: 'r-1',
        snapshot: makeRecipeDetail(),
        diff: makeRecipeDiff(),
        trigger: 'ai_cleanup',
        summary: 'Improved structure',
      },
      mockQuery,
    );
    const callArgs = mockQuery.mock.calls[0];
    expect(callArgs?.[1]).toContain('ai_cleanup');
    expect(callArgs?.[1]).toContain('Improved structure');
  });
});
