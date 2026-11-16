import {act, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';
import {STALE_COMMENT_HINT} from '@eciperay/client';
import type {RecipeDetailPageComments} from '@spudly/ui';

import {eciperay} from '../lib/api.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {useRecipeCommentsProps} from './useRecipeCommentsProps.js';

const API = 'http://localhost:8080';

const sampleComment = {
  id: 'comment-1',
  recipeId: 'recipe-uuid-1',
  authorUserId: 'user-1',
  authorDisplayName: 'Alex',
  body: 'Delicious!',
  contentRevision: 1,
  isStale: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

/**
 * The comments section crosses into the design-system pages as data props (B7
 * T1, eciperay#552), so its host logic is a hook: these tests drive the hook
 * through a probe that captures the props it returns for RecipeCommentsView,
 * and pin the mapping and mutation wiring the composed RecipeCommentsSection
 * used to render directly (including its #418 error surfacing).
 */
const renderCommentsProps = async (
  options: {
    recipeId?: string;
    ownerUserId?: string;
    shareToken?: string;
    publicList?: boolean;
  } = {},
  renderOptions: {withAuth?: boolean} = {},
) => {
  let captured: RecipeDetailPageComments | null = null;
  const Probe = () => {
    captured = useRecipeCommentsProps({
      recipeId: options.recipeId ?? 'recipe-uuid-1',
      ownerUserId: options.ownerUserId,
      shareToken: options.shareToken,
      publicList: options.publicList,
    });
    return null;
  };
  await renderWithProviders(<Probe />, renderOptions);
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
  test('maps comments with stale flags and author eligibility', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json([sampleComment]),
      ),
    );
    const {props} = await renderCommentsProps({ownerUserId: 'owner-uuid'});
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
    expect(props().loading).toBe(false);
    expect(props().staleHintLabel).toBe(STALE_COMMENT_HINT);
    expect(props().comments[0]).toEqual({
      id: 'comment-1',
      authorName: 'Alex',
      body: 'Delicious!',
      isStale: true,
      canEdit: true,
      canDelete: true,
    });
  });

  test('public mode lists via the public endpoint with the share token (B7 T7)', async () => {
    let requestUrl = '';
    server.use(
      http.get(`${API}/api/public/recipes/:id/comments`, ({request}) => {
        requestUrl = request.url;
        return HttpResponse.json([sampleComment]);
      }),
    );
    const {props} = await renderCommentsProps(
      {shareToken: 'share-token', publicList: true},
      {withAuth: false},
    );
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
    expect(requestUrl).toContain('t=share-token');
    // Signed out on the public page: no composer is offered.
    expect(props().onPost).toBeUndefined();
  });

  test('reports loading while the query is in flight', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () => new Promise(() => {})),
    );
    const {props} = await renderCommentsProps();
    expect(props().loading).toBe(true);
    expect(props().comments).toEqual([]);
  });

  test('reports an error instead of an empty list when the query fails', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json({error: 'boom'}, {status: 500}),
      ),
    );
    const {props} = await renderCommentsProps();
    await waitFor(() => {
      expect(props().error).toBe("Couldn't load comments.");
    });
    expect(props().comments).toEqual([]);
  });

  test('falls back to Anonymous for a missing display name', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json([
          {...sampleComment, authorDisplayName: null, isStale: false},
        ]),
      ),
    );
    const {props} = await renderCommentsProps();
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
    expect(props().comments[0]?.authorName).toBe('Anonymous');
  });

  test('lets owners delete comments they did not author', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json([
          {...sampleComment, authorUserId: 'other-user', isStale: false},
        ]),
      ),
    );
    // The test session's user is user-1, who owns this recipe.
    const {props} = await renderCommentsProps({ownerUserId: 'user-1'});
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
    expect(props().comments[0]?.canEdit).toBe(false);
    expect(props().comments[0]?.canDelete).toBe(true);
  });

  test('posts, edits, and deletes comments', async () => {
    const createComment = vi
      .spyOn(eciperay.recipes, 'createComment')
      .mockResolvedValue(sampleComment as never);
    const updateComment = vi
      .spyOn(eciperay.recipes, 'updateComment')
      .mockResolvedValue({...sampleComment, body: 'Updated'} as never);
    const deleteComment = vi
      .spyOn(eciperay.recipes, 'deleteComment')
      .mockResolvedValue(undefined as never);
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json([sampleComment]),
      ),
    );
    try {
      const {props} = await renderCommentsProps({ownerUserId: 'owner-uuid'});
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
        expect(createComment).toHaveBeenCalledWith('recipe-uuid-1', {
          body: 'Nice!',
        });
      });

      await act(async () => {
        props().onStartEdit?.('comment-1');
      });
      expect(props().editingCommentId).toBe('comment-1');
      expect(props().editDraft).toBe('Delicious!');
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
        expect(updateComment).toHaveBeenCalledWith(
          'recipe-uuid-1',
          'comment-1',
          {body: 'Updated'},
        );
      });

      await act(async () => {
        props().onDeleteComment?.('comment-1');
      });
      await waitFor(() => {
        expect(deleteComment).toHaveBeenCalledWith(
          'recipe-uuid-1',
          'comment-1',
        );
      });
    } finally {
      createComment.mockRestore();
      updateComment.mockRestore();
      deleteComment.mockRestore();
    }
  });

  test('surfaces the server error and keeps the draft when posting fails (#418)', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () => HttpResponse.json([])),
      http.post(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json({error: 'Comments are closed'}, {status: 403}),
      ),
    );
    const {props} = await renderCommentsProps();
    await act(async () => {
      props().onDraftChange?.('Nice!');
    });
    await act(async () => {
      props().onPost?.();
    });
    await waitFor(() => {
      expect(props().error).toBe('Could not post comment: Comments are closed');
    });
    // The draft is kept so the failed comment is not lost.
    expect(props().draft).toBe('Nice!');
  });

  test('surfaces the server error and keeps the edit when updating fails (#418)', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json([sampleComment]),
      ),
      http.put(`${API}/api/recipes/:id/comments/:commentId`, () =>
        HttpResponse.json({error: 'Comment is stale'}, {status: 409}),
      ),
    );
    const {props} = await renderCommentsProps();
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
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
      expect(props().error).toBe('Could not update comment: Comment is stale');
    });
    // The edit stays open with its text so the failed change is not lost.
    expect(props().editingCommentId).toBe('comment-1');
    expect(props().editDraft).toBe('Updated');
  });

  test('offers no composer to signed-out viewers', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json([sampleComment]),
      ),
    );
    const {props} = await renderCommentsProps({}, {withAuth: false});
    await waitFor(() => {
      expect(props().comments).toHaveLength(1);
    });
    expect(props().onPost).toBeUndefined();
    expect(props().draft).toBeUndefined();
  });
});
