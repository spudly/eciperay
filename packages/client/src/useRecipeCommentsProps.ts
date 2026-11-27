import {useLingui} from '@lingui/react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {useAuth} from './AuthProvider.js';
import type {EciperayClient} from './createEciperayClient.js';
import {queryKeys} from './queryKeys.js';
import type {RecipeCommentsViewProps} from './ui/recipeDetailViewComponents.js';

export type UseRecipeCommentsPropsOptions = {
  recipeId: string;
  ownerUserId?: string;
  shareToken?: string;
  publicList?: boolean;
  /**
   * Web (#418): a rejected create, update, or delete keeps its
   * draft/edit text and surfaces the server's reason through the
   * view's `error` prop. The app leaves mutation failures silent, as
   * its section behaved — only the list query's error crosses.
   */
  surfaceMutationErrors?: boolean;
};

/**
 * The recipe comments section's host logic, shared by both hosts since
 * #676 (B7 T1, eciperay#552; #438 Part 3 in the app): the section's
 * query, compose/edit draft state, and three mutations live here, and
 * the section crosses into RecipeDetailPage as its `comments` data
 * prop (RecipeCommentsView's view-model). The typed client is passed
 * in by the host. Since B7 T7 (eciperay#557, @spudly/ui 10.0.0) the
 * public recipe page uses this hook too, with `publicList` set: its
 * list query goes through the public comments endpoint carrying the
 * page's share token, and no ownerUserId is passed, so delete
 * eligibility stays author-only there, exactly as the retired composed
 * RecipeCommentsSection behaved on that page.
 *
 * Every mapping is the one the composed sections rendered: the author
 * fallback, the stale hint, the edit/delete eligibility (author, or
 * the recipe owner for delete), and the composer offered only to
 * signed-in viewers. One presentation delta rides with the view: while
 * an error is showing, the view renders its alert in place of the
 * comment list (the composed section rendered the message above the
 * list).
 */
export const useRecipeCommentsProps = (
  client: EciperayClient,
  {
    recipeId,
    ownerUserId,
    shareToken,
    publicList = false,
    surfaceMutationErrors = false,
  }: UseRecipeCommentsPropsOptions,
): RecipeCommentsViewProps => {
  const {i18n} = useLingui();
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = session?.user.id;
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  // Comment mutations surface rejections instead of failing silently
  // (#418, web): the draft/edit text stays in place so nothing is
  // lost, and the server's reason is shown through the view's error
  // prop.
  const showCommentError = (action: string) => (error: Error) => {
    if (!surfaceMutationErrors) {
      return;
    }
    setCommentError(
      `${action}: ${
        error instanceof Error
          ? error.message
          : i18n._({
              id: 'recipeDetail.pleaseTryAgain',
              message: 'Please try again.',
            })
      }`,
    );
  };

  const commentsQueryKey = publicList
    ? queryKeys.recipeComments(recipeId, shareToken)
    : queryKeys.recipeComments(recipeId);

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () =>
      publicList
        ? client.recipes.listPublicComments(recipeId, {shareToken})
        : client.recipes.listComments(recipeId),
    // The public page calls this hook before its recipe has loaded
    // (empty id); the detail hosts always have an id.
    enabled: recipeId.length > 0,
  });
  const comments = Array.isArray(data) ? data : [];

  const invalidateComments = () => {
    void queryClient.invalidateQueries({queryKey: commentsQueryKey});
  };

  const createMutation = useMutation({
    mutationFn: (body: string) =>
      client.recipes.createComment(recipeId, {body}),
    onSuccess: () => {
      setDraft('');
      setCommentError(null);
      invalidateComments();
    },
    onError: showCommentError(
      i18n._({
        id: 'recipeComments.couldNotPost',
        message: 'Could not post comment',
      }),
    ),
  });

  const updateMutation = useMutation({
    mutationFn: ({commentId, body}: {commentId: string; body: string}) =>
      client.recipes.updateComment(recipeId, commentId, {body}),
    onSuccess: () => {
      setEditingId(null);
      setEditDraft('');
      setCommentError(null);
      invalidateComments();
    },
    onError: showCommentError(
      i18n._({
        id: 'recipeComments.couldNotUpdate',
        message: 'Could not update comment',
      }),
    ),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      client.recipes.deleteComment(recipeId, commentId),
    onSuccess: () => {
      setCommentError(null);
      invalidateComments();
    },
    onError: showCommentError(
      i18n._({
        id: 'recipeComments.couldNotDelete',
        message: 'Could not delete comment',
      }),
    ),
  });

  return {
    comments: comments.map(comment => ({
      id: comment.id,
      authorName:
        comment.authorDisplayName?.trim() ??
        i18n._({id: 'recipeComments.anonymousAuthor', message: 'Anonymous'}),
      body: comment.body,
      isStale: comment.isStale,
      canEdit: comment.authorUserId === currentUserId,
      // A signed-out viewer has no id: without the guard, the public
      // page's omitted ownerUserId (undefined) would equal the viewer's
      // undefined id and grant delete eligibility on every comment.
      canDelete:
        currentUserId !== undefined &&
        (comment.authorUserId === currentUserId ||
          ownerUserId === currentUserId),
    })),
    loading: isLoading,
    error:
      commentError ??
      (queryError
        ? i18n._({
            id: 'recipeComments.loadError',
            message: "Couldn't load comments.",
          })
        : null),
    staleHintLabel: i18n._({
      id: 'recipeComments.staleHint',
      message: 'This comment dates from an earlier version — the recipe may have evolved since.',
    }),
    editingCommentId: editingId,
    editDraft,
    isUpdatePending: updateMutation.isPending,
    isDeletePending: deleteMutation.isPending,
    onEditDraftChange: setEditDraft,
    onStartEdit: (commentId: string) => {
      const comment = comments.find(item => item.id === commentId);
      if (!comment) {
        return;
      }
      setEditingId(comment.id);
      setEditDraft(comment.body);
    },
    onCancelEdit: () => {
      setEditingId(null);
      setEditDraft('');
    },
    onSaveEdit: (commentId: string) => {
      updateMutation.mutate({commentId, body: editDraft.trim()});
    },
    onDeleteComment: (commentId: string) => {
      deleteMutation.mutate(commentId);
    },
    ...(currentUserId
      ? {
          draft,
          onDraftChange: setDraft,
          onPost: () => {
            createMutation.mutate(draft.trim());
          },
          isPostPending: createMutation.isPending,
          composerPlaceholder: i18n._({
            id: 'recipeComments.composerPlaceholder',
            message: 'Add a comment',
          }),
        }
      : {}),
  };
};
