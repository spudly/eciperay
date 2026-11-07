import React from 'react';
import {act, waitFor} from '@testing-library/react-native';
import {STALE_COMMENT_HINT, useAuth} from '@eciperay/client';
import type {RecipeDetailPageComments} from '@spudly/ui';

import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {useRecipeCommentsProps} from './RecipeCommentsSection';

jest.mock('../../lib/api');
jest.mock('@eciperay/client', () => ({
  ...jest.requireActual('@eciperay/client'),
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockListComments = api.recipes.listComments as jest.Mock;
const mockCreateComment = api.recipes.createComment as jest.Mock;
const mockUpdateComment = api.recipes.updateComment as jest.Mock;
const mockDeleteComment = api.recipes.deleteComment as jest.Mock;

const sampleComment = {
  id: 'comment-1',
  recipeId: 'recipe-uuid-1',
  authorUserId: 'user-uuid-1',
  authorDisplayName: 'Alex',
  body: 'Great!',
  contentRevision: 1,
  isStale: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * The comments section crosses into RecipeDetailPage as data props (#438 Part
 * 3), so its host logic is a hook: these tests drive the hook through a probe
 * that captures the props it returns for RecipeCommentsView, and pin the
 * mapping and mutation wiring the composed section used to render directly.
 */
const renderCommentsProps = async (
  recipeId = 'recipe-uuid-1',
  ownerUserId = 'owner-uuid',
) => {
  let captured: RecipeDetailPageComments | null = null;
  const Probe = () => {
    captured = useRecipeCommentsProps(recipeId, ownerUserId);
    return null;
  };
  await renderWithProviders(<Probe />);
  return {
    props: () => {
      if (!captured) {
        throw new Error('hook did not render');
      }
      return captured;
    },
  };
};

describe('useRecipeCommentsProps', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-uuid-1', email: 'test@example.com'}},
    });
    mockListComments.mockResolvedValue([sampleComment]);
    mockCreateComment.mockResolvedValue(sampleComment);
    mockUpdateComment.mockResolvedValue({
      ...sampleComment,
      body: 'Updated',
      isStale: false,
    });
    mockDeleteComment.mockImplementation(async () => {});
  });

  test('maps comments with stale flags and author eligibility', async () => {
    const {props} = await renderCommentsProps();
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
    expect(props().loading).toBe(false);
    expect(props().staleHintLabel).toBe(STALE_COMMENT_HINT);
    expect(props().comments[0]).toEqual({
      id: 'comment-1',
      authorName: 'Alex',
      body: 'Great!',
      isStale: true,
      canEdit: true,
      canDelete: true,
    });
  });

  test('reports loading while the query is in flight', async () => {
    mockListComments.mockImplementation(() => new Promise(() => {}));
    const {props} = await renderCommentsProps();
    expect(props().loading).toBe(true);
    expect(props().comments).toEqual([]);
  });

  test('falls back to Anonymous for a missing display name', async () => {
    mockListComments.mockResolvedValue([
      {...sampleComment, authorDisplayName: null, isStale: false},
    ]);
    const {props} = await renderCommentsProps();
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
    expect(props().comments[0]?.authorName).toBe('Anonymous');
  });

  test('lets owners delete comments they did not author', async () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'owner-uuid', email: 'owner@example.com'}},
    });
    mockListComments.mockResolvedValue([
      {...sampleComment, authorUserId: 'other-user', isStale: false},
    ]);
    const {props} = await renderCommentsProps();
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
    expect(props().comments[0]?.canEdit).toBe(false);
    expect(props().comments[0]?.canDelete).toBe(true);
    await act(async () => {
      props().onDeleteComment?.('comment-1');
    });
    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'comment-1',
      );
    });
  });

  test('hides actions for viewers who cannot moderate', async () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'viewer-uuid', email: 'viewer@example.com'}},
    });
    mockListComments.mockResolvedValue([
      {...sampleComment, authorUserId: 'other-user', isStale: false},
    ]);
    const {props} = await renderCommentsProps();
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
    expect(props().comments[0]?.canEdit).toBe(false);
    expect(props().comments[0]?.canDelete).toBe(false);
  });

  test('posts, edits, and deletes comments', async () => {
    const {props} = await renderCommentsProps();
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });

    await act(async () => {
      props().onDraftChange?.('Nice!');
    });
    await act(async () => {
      props().onPost?.();
    });
    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith('recipe-uuid-1', {
        body: 'Nice!',
      });
    });

    await act(async () => {
      props().onStartEdit?.('comment-1');
    });
    expect(props().editingCommentId).toBe('comment-1');
    expect(props().editDraft).toBe('Great!');
    await act(async () => {
      props().onCancelEdit?.();
    });
    expect(props().editingCommentId).toBeNull();
    expect(props().editDraft).toBe('');

    await act(async () => {
      props().onStartEdit?.('comment-1');
    });
    await act(async () => {
      props().onEditDraftChange?.('Updated');
    });
    await act(async () => {
      props().onSaveEdit?.('comment-1');
    });
    await waitFor(() => {
      expect(mockUpdateComment).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'comment-1',
        {body: 'Updated'},
      );
    });

    await act(async () => {
      props().onDeleteComment?.('comment-1');
    });
    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'comment-1',
      );
    });
  });

  test('offers no composer to signed-out viewers', async () => {
    mockUseAuth.mockReturnValue({session: null});
    const {props} = await renderCommentsProps();
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
    expect(props().onPost).toBeUndefined();
    expect(props().draft).toBeUndefined();
  });
});
