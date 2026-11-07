import {
  makeRecipeDetail,
  queryKeys,
  STALE_COMMENT_HINT,
  useAuth,
} from '@eciperay/client';
import type {RecipeDetailPageComments} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {api} from '../../lib/api';

/**
 * The recipe comments section's host logic (#438 Part 3): the section's query,
 * compose/edit draft state, and three mutations stay app-side, and the section
 * crosses into RecipeDetailPage as its `comments` data prop
 * (RecipeCommentsView's view-model) — @spudly/ui 6.x exports pages only, so the
 * DS Card / CommentItem / TextAreaField this file used to compose are the
 * page's own composition now. Every mapping below is the one the composed
 * section rendered: the author fallback, the stale hint, the edit/delete
 * eligibility (author, or the recipe owner for delete), and the composer
 * offered only to signed-in viewers.
 *
 * Two presentation deltas ride with the view, both the DS view's own treatment:
 * loading renders the view's spinner (labeled "Loading comments") instead of
 * the app's book loader, and the composer carries the view's "Add a comment"
 * label above the field whose placeholder keeps the same copy.
 */
export const useRecipeCommentsProps = (
  recipeId: string,
  ownerUserId: string,
): RecipeDetailPageComments => {
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = session?.user.id;
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const commentsQueryKey = queryKeys.recipeComments(recipeId);

  const {data, isLoading, error} = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => api.recipes.listComments(recipeId),
  });
  const comments = Array.isArray(data) ? data : [];

  const invalidateComments = () => {
    void queryClient.invalidateQueries({queryKey: commentsQueryKey});
  };

  const createMutation = useMutation({
    mutationFn: (body: string) => api.recipes.createComment(recipeId, {body}),
    onSuccess: () => {
      setDraft('');
      invalidateComments();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({commentId, body}: {commentId: string; body: string}) =>
      api.recipes.updateComment(recipeId, commentId, {body}),
    onSuccess: () => {
      setEditingId(null);
      setEditDraft('');
      invalidateComments();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      api.recipes.deleteComment(recipeId, commentId),
    onSuccess: invalidateComments,
  });

  return {
    comments: comments.map(comment => ({
      id: comment.id,
      authorName: comment.authorDisplayName?.trim() ?? 'Anonymous',
      body: comment.body,
      isStale: comment.isStale,
      canEdit: comment.authorUserId === currentUserId,
      canDelete:
        comment.authorUserId === currentUserId || ownerUserId === currentUserId,
    })),
    loading: isLoading,
    error: error ? "Couldn't load comments." : null,
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
