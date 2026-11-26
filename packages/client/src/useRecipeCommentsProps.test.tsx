import {act, renderHook, waitFor} from '@testing-library/react';

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
});
