import {act, renderHook, waitFor} from '@testing-library/react';

import {STALE_COMMENT_HINT} from './recipeEngagement.js';
import type {EciperayClient} from './createEciperayClient.js';
import {makeHookWrapper} from './test/hookTestUtils.js';
import {useRecipeCommentsProps} from './useRecipeCommentsProps.js';

const sampleComment = {
  id: 'comment-1',
  recipeId: 'recipe-uuid-1',
  authorUserId: 'user-uuid-1',
  authorDisplayName: 'Alex',
  body: 'Great!',
  contentRevision: 1,
  isStale: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const makeClient = () => {
  const recipes = {
    listComments: jest.fn().mockResolvedValue([sampleComment]),
    listPublicComments: jest.fn().mockResolvedValue([sampleComment]),
    createComment: jest.fn().mockResolvedValue(sampleComment),
    updateComment: jest.fn().mockResolvedValue(sampleComment),
    deleteComment: jest.fn().mockResolvedValue(undefined),
  };
  return {client: {recipes} as unknown as EciperayClient, recipes};
};

describe('useRecipeCommentsProps', () => {
  test('maps comments and posts through the client', async () => {
    const {client, recipes} = makeClient();
    const {wrapper} = makeHookWrapper('user-uuid-1');
    const {result} = renderHook(
      () =>
        useRecipeCommentsProps(client, {
          recipeId: 'recipe-uuid-1',
          ownerUserId: 'owner-uuid',
          surfaceMutationErrors: true,
        }),
      {wrapper},
    );
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });
    expect(result.current.comments[0]).toMatchObject({
      authorName: 'Alex',
      canEdit: true,
      canDelete: true,
    });
    act(() => {
      result.current.onDraftChange?.('Nice recipe');
    });
    act(() => {
      result.current.onPost?.();
    });
    await waitFor(() => {
      expect(recipes.createComment).toHaveBeenCalledWith('recipe-uuid-1', {
        body: 'Nice recipe',
      });
    });
  });

  test('a rejected post keeps the draft and surfaces the error (#418)', async () => {
    const {client, recipes} = makeClient();
    recipes.createComment.mockRejectedValue(new Error('nope'));
    const {wrapper} = makeHookWrapper('user-uuid-1');
    const {result} = renderHook(
      () =>
        useRecipeCommentsProps(client, {
          recipeId: 'recipe-uuid-1',
          surfaceMutationErrors: true,
        }),
      {wrapper},
    );
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });
    act(() => {
      result.current.onDraftChange?.('Draft text');
    });
    act(() => {
      result.current.onPost?.();
    });
    await waitFor(() => {
      expect(result.current.error).toContain('Could not post comment');
    });
    expect(result.current.draft).toBe('Draft text');
  });

  test('public list mode uses the public endpoint with the share token', async () => {
    const {client, recipes} = makeClient();
    const {wrapper} = makeHookWrapper(null);
    const {result} = renderHook(
      () =>
        useRecipeCommentsProps(client, {
          recipeId: 'recipe-uuid-1',
          shareToken: 'token-abc',
          publicList: true,
        }),
      {wrapper},
    );
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });
    expect(recipes.listPublicComments).toHaveBeenCalledWith('recipe-uuid-1', {
      shareToken: 'token-abc',
    });
    // Signed-out viewers get no composer and no delete eligibility.
    expect(result.current.onPost).toBeUndefined();
    expect(result.current.comments[0]?.canDelete).toBe(false);
  });

  test('maps comments with stale flags and author eligibility', async () => {
    const {client, recipes} = makeClient();
    recipes.listComments.mockResolvedValue([{...sampleComment, isStale: true}]);
    const {wrapper} = makeHookWrapper('user-uuid-1');
    const {result} = renderHook(
      () =>
        useRecipeCommentsProps(client, {
          recipeId: 'recipe-uuid-1',
          ownerUserId: 'owner-uuid',
        }),
      {wrapper},
    );
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.staleHintLabel).toBe(STALE_COMMENT_HINT);
    expect(result.current.composerPlaceholder).toBe('Add a comment');
    expect(result.current.comments[0]).toEqual({
      id: 'comment-1',
      authorName: 'Alex',
      body: 'Great!',
      isStale: true,
      canEdit: true,
      canDelete: true,
    });
  });

  test('reports loading while the query is in flight', async () => {
    const {client, recipes} = makeClient();
    recipes.listComments.mockImplementation(() => new Promise(() => {}));
    const {wrapper} = makeHookWrapper('user-uuid-1');
    const {result} = renderHook(
      () => useRecipeCommentsProps(client, {recipeId: 'recipe-uuid-1'}),
      {wrapper},
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.comments).toEqual([]);
  });

  test('reports an error instead of an empty list when the query fails', async () => {
    const {client, recipes} = makeClient();
    recipes.listComments.mockRejectedValue(new Error('boom'));
    const {wrapper} = makeHookWrapper('user-uuid-1');
    const {result} = renderHook(
      () => useRecipeCommentsProps(client, {recipeId: 'recipe-uuid-1'}),
      {wrapper},
    );
    await waitFor(() => {
      expect(result.current.error).toBe("Couldn't load comments.");
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.comments).toEqual([]);
  });

  test('falls back to Anonymous for a missing display name', async () => {
    const {client, recipes} = makeClient();
    recipes.listComments.mockResolvedValue([
      {...sampleComment, authorDisplayName: null},
    ]);
    const {wrapper} = makeHookWrapper('user-uuid-1');
    const {result} = renderHook(
      () => useRecipeCommentsProps(client, {recipeId: 'recipe-uuid-1'}),
      {wrapper},
    );
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });
    expect(result.current.comments[0]?.authorName).toBe('Anonymous');
  });

  test('lets owners delete comments they did not author', async () => {
    const {client, recipes} = makeClient();
    recipes.listComments.mockResolvedValue([
      {...sampleComment, authorUserId: 'other-user'},
    ]);
    const {wrapper} = makeHookWrapper('owner-uuid');
    const {result} = renderHook(
      () =>
        useRecipeCommentsProps(client, {
          recipeId: 'recipe-uuid-1',
          ownerUserId: 'owner-uuid',
        }),
      {wrapper},
    );
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });
    expect(result.current.comments[0]?.canEdit).toBe(false);
    expect(result.current.comments[0]?.canDelete).toBe(true);
    act(() => {
      result.current.onDeleteComment?.('comment-1');
    });
    await waitFor(() => {
      expect(recipes.deleteComment).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'comment-1',
      );
    });
  });

  test('hides actions for viewers who cannot moderate', async () => {
    const {client, recipes} = makeClient();
    recipes.listComments.mockResolvedValue([
      {...sampleComment, authorUserId: 'other-user'},
    ]);
    const {wrapper} = makeHookWrapper('viewer-uuid');
    const {result} = renderHook(
      () =>
        useRecipeCommentsProps(client, {
          recipeId: 'recipe-uuid-1',
          ownerUserId: 'owner-uuid',
        }),
      {wrapper},
    );
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });
    expect(result.current.comments[0]?.canEdit).toBe(false);
    expect(result.current.comments[0]?.canDelete).toBe(false);
  });

  test('edits and deletes comments', async () => {
    const {client, recipes} = makeClient();
    const {wrapper} = makeHookWrapper('user-uuid-1');
    const {result} = renderHook(
      () => useRecipeCommentsProps(client, {recipeId: 'recipe-uuid-1'}),
      {wrapper},
    );
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });
    act(() => {
      result.current.onStartEdit?.('comment-1');
    });
    expect(result.current.editingCommentId).toBe('comment-1');
    expect(result.current.editDraft).toBe('Great!');
    act(() => {
      result.current.onCancelEdit?.();
    });
    expect(result.current.editingCommentId).toBeNull();
    expect(result.current.editDraft).toBe('');
    act(() => {
      result.current.onStartEdit?.('comment-1');
    });
    act(() => {
      result.current.onEditDraftChange?.('Updated');
    });
    act(() => {
      result.current.onSaveEdit?.('comment-1');
    });
    await waitFor(() => {
      expect(recipes.updateComment).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'comment-1',
        {body: 'Updated'},
      );
    });
    act(() => {
      result.current.onDeleteComment?.('comment-1');
    });
    await waitFor(() => {
      expect(recipes.deleteComment).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'comment-1',
      );
    });
  });

  test('offers no composer to signed-out viewers', async () => {
    const {client} = makeClient();
    const {wrapper} = makeHookWrapper(null);
    const {result} = renderHook(
      () => useRecipeCommentsProps(client, {recipeId: 'recipe-uuid-1'}),
      {wrapper},
    );
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });
    expect(result.current.onPost).toBeUndefined();
    expect(result.current.draft).toBeUndefined();
  });
});
