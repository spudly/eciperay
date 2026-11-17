import {queryKeys, STALE_COMMENT_HINT, useAuth} from '@eciperay/client';
import type {RecipeDetailPageComments} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {eciperay} from '../lib/api.js';

type UseRecipeCommentsPropsOptions = {
  recipeId: string;
  ownerUserId?: string;
  shareToken?: string;
  publicList?: boolean;
};

/**
 * The recipe comments section's web host logic (B7 T1, eciperay#552): the
 * section's query, compose/edit draft state, and three mutations stay web-side,
 * and the section crosses into RecipeDetailPage as its `comments` data prop
 * (RecipeCommentsView's view-model) — the native app's useRecipeCommentsProps
 * (packages/app/src/hosts/recipe) is the template. Since B7 T7 (eciperay#557,
 * @spudly/ui 10.0.0) the public recipe page uses this hook too, with
 * `publicList` set: its list query goes through the public comments endpoint
 * carrying the page's share token, and no ownerUserId is passed, so delete
 * eligibility stays author-only there, exactly as the retired composed
 * RecipeCommentsSection behaved on that page.
 *
 * The web section's #418 error handling carries over: a rejected create,
 * update, or delete keeps its draft/edit text and surfaces the server's reason
 * through the view's `error` prop ("Could not post comment: …"), clearing on
 * the next success; a failed list query reports the app hook's "Couldn't load
 * comments." One presentation delta rides with the view: while an error is
 * showing, the view renders its alert in place of the comment list (the
 * composed section rendered the message above the list). Every other mapping is
 * the one the composed section rendered: the author fallback, the stale hint,
 * the edit/delete eligibility (author, or the recipe owner for delete), and the
 * composer offered only to signed-in viewers.
 */
export const useRecipeCommentsProps = ({
  recipeId,
  ownerUserId,
  shareToken,
  publicList = false,
}: UseRecipeCommentsPropsOptions): RecipeDetailPageComments => {
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = session?.user.id;
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  // Comment mutations surface rejections instead of failing silently
  // (#418): the draft/edit text stays in place so nothing is lost, and
  // the server's reason is shown through the view's error prop.
  const showCommentError = (action: string) => (error: Error) => {
    setCommentError(
      `${action}: ${error instanceof Error ? error.message : 'Please try again.'}`,
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
        ? eciperay.recipes.listPublicComments(recipeId, {shareToken})
        : eciperay.recipes.listComments(recipeId),
    // The public page calls this hook before its recipe has loaded
    // (empty id); the detail host always has an id.
    enabled: recipeId.length > 0,
  });
  const comments = Array.isArray(data) ? data : [];

  const invalidateComments = () => {
    void queryClient.invalidateQueries({queryKey: commentsQueryKey});
  };

  const createMutation = useMutation({
    mutationFn: (body: string) =>
      eciperay.recipes.createComment(recipeId, {body}),
    onSuccess: () => {
      setDraft('');
      setCommentError(null);
      invalidateComments();
    },
    onError: showCommentError('Could not post comment'),
  });

  const updateMutation = useMutation({
    mutationFn: ({commentId, body}: {commentId: string; body: string}) =>
      eciperay.recipes.updateComment(recipeId, commentId, {body}),
    onSuccess: () => {
      setEditingId(null);
      setEditDraft('');
      setCommentError(null);
      invalidateComments();
    },
    onError: showCommentError('Could not update comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      eciperay.recipes.deleteComment(recipeId, commentId),
    onSuccess: () => {
      setCommentError(null);
      invalidateComments();
    },
    onError: showCommentError('Could not delete comment'),
  });

  return {
    comments: comments.map(comment => ({
      id: comment.id,
      authorName: comment.authorDisplayName?.trim() ?? 'Anonymous',
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
    error: commentError ?? (queryError ? "Couldn't load comments." : null),
    staleHintLabel: STALE_COMMENT_HINT,
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
          composerPlaceholder: 'Add a comment',
        }
      : {}),
  };
};
