import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {
  deleteRecipeCommentByAuthor,
  deleteRecipeCommentByOwner,
  getRecipeComment,
  insertRecipeComment,
  listRecipeComments,
  updateRecipeComment,
} from './recipeCommentQueries.js';

describe('recipeCommentQueries', () => {
  test('lists, inserts, reads, updates, and deletes comments', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));

    await listRecipeComments('recipe-uuid-1', mockQuery);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'recipe-uuid-1',
    ]);

    await insertRecipeComment(
      {
        recipeId: 'recipe-uuid-1',
        userId: 'viewer-uuid',
        body: 'Great!',
        contentRevision: 2,
      },
      mockQuery,
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'recipe-uuid-1',
      'viewer-uuid',
      'Great!',
      2,
    ]);

    await getRecipeComment('comment-uuid-1', 'recipe-uuid-1', mockQuery);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'comment-uuid-1',
      'recipe-uuid-1',
    ]);

    await updateRecipeComment(
      {
        commentId: 'comment-uuid-1',
        recipeId: 'recipe-uuid-1',
        userId: 'viewer-uuid',
        body: 'Updated',
      },
      mockQuery,
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'comment-uuid-1',
      'recipe-uuid-1',
      'Updated',
      'viewer-uuid',
    ]);

    await deleteRecipeCommentByAuthor(
      {
        commentId: 'comment-uuid-1',
        recipeId: 'recipe-uuid-1',
        userId: 'viewer-uuid',
      },
      mockQuery,
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'comment-uuid-1',
      'recipe-uuid-1',
      'viewer-uuid',
    ]);

    await deleteRecipeCommentByOwner(
      'comment-uuid-1',
      'recipe-uuid-1',
      mockQuery,
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'comment-uuid-1',
      'recipe-uuid-1',
    ]);
  });
});
