import {mapRowToRecipeComment} from './mapRowToRecipeComment.js';

describe('mapRowToRecipeComment', () => {
  test('maps comment rows and stale state', () => {
    expect(
      mapRowToRecipeComment(
        {
          id: 'comment-1',
          recipe_id: 'recipe-1',
          user_id: 'user-1',
          author_display_name: 'Alex',
          body: 'Delicious!',
          content_revision: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
        2,
      ),
    ).toEqual({
      id: 'comment-1',
      recipeId: 'recipe-1',
      authorUserId: 'user-1',
      authorDisplayName: 'Alex',
      body: 'Delicious!',
      contentRevision: 1,
      isStale: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    });
  });
});
