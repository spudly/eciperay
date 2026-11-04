/* eslint-disable max-lines -- recipe comments with create/edit/delete flows */
import {queryKeys, useAuth} from '@eciperay/client';
import {eciperayTheme, tokens} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {YStack} from 'tamagui';

import {eciperay} from '../../lib/api.js';
import {BookLoadingSpinner} from '../ui/BookLoadingSpinner.js';

import {RecipeCommentItem} from './RecipeCommentItem.js';

type Props = {
  recipeId: string;
  ownerUserId?: string;
  shareToken?: string;
  publicList?: boolean;
};

export const RecipeCommentsSection = ({
  recipeId,
  ownerUserId,
  shareToken,
  publicList = false,
}: Props) => {
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = session?.user.id;
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  // Comment mutations surface rejections instead of failing silently
  // (#418): the draft/edit text stays in place so nothing is lost, and
  // the server's reason is shown above the comment list.
  const showCommentError = (action: string) => (error: Error) => {
    setCommentError(
      `${action}: ${error instanceof Error ? error.message : 'Please try again.'}`,
    );
  };

  const commentsQueryKey = queryKeys.recipeComments(recipeId, shareToken);

  const {data, isLoading} = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () =>
      publicList
        ? eciperay.recipes.listPublicComments(recipeId, {shareToken})
        : eciperay.recipes.listComments(recipeId),
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

  return (
    <div
      style={{
        marginBottom: tokens.spacing[4],
        borderRadius: 12,
        border: `1px solid ${tokens.colors.gray.gray2}`,
        padding: tokens.spacing[4],
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: tokens.spacing[3],
          fontSize: tokens.typography.fontSize.sm,
          fontWeight: tokens.typography.fontWeight.semibold,
          color: tokens.colors.gray.gray10,
        }}
      >
        Comments
      </h3>
      {commentError ? (
        <p
          role="alert"
          style={{
            margin: 0,
            marginBottom: tokens.spacing[3],
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.danger.danger7,
          }}
        >
          {commentError}
        </p>
      ) : null}
      {isLoading ? (
        <YStack
          alignItems="center"
          justifyContent="center"
          marginBottom="$3"
        >
          <BookLoadingSpinner size="sm" />
        </YStack>
      ) : null}
      {!isLoading && comments.length === 0 ? (
        <p
          style={{
            margin: 0,
            marginBottom: tokens.spacing[3],
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.gray.gray7,
          }}
        >
          No comments yet
        </p>
      ) : null}
      <ul
        style={{
          margin: 0,
          marginBottom: tokens.spacing[4],
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing[3],
        }}
      >
        {comments.map(comment => (
          <RecipeCommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            ownerUserId={ownerUserId}
            isEditing={editingId === comment.id}
            editDraft={editDraft}
            isUpdatePending={updateMutation.isPending}
            isDeletePending={deleteMutation.isPending}
            onEditDraftChange={setEditDraft}
            onStartEdit={() => {
              setEditingId(comment.id);
              setEditDraft(comment.body);
            }}
            onCancelEdit={() => {
              setEditingId(null);
              setEditDraft('');
            }}
            onSaveEdit={() => {
              updateMutation.mutate({
                commentId: comment.id,
                body: editDraft.trim(),
              });
            }}
            onDelete={() => {
              deleteMutation.mutate(comment.id);
            }}
          />
        ))}
      </ul>
      {currentUserId ? (
        <form
          style={{display: 'flex', flexDirection: 'column', gap: tokens.spacing[2]}}
          onSubmit={event => {
            event.preventDefault();
            createMutation.mutate(draft.trim());
          }}
        >
          <textarea
            style={{
              borderRadius: 8,
              border: `1px solid ${tokens.colors.gray.gray4}`,
              backgroundColor: eciperayTheme.semantic.surface,
              paddingLeft: tokens.spacing[3],
              paddingRight: tokens.spacing[3],
              paddingTop: tokens.spacing[2],
              paddingBottom: tokens.spacing[2],
              fontSize: tokens.typography.fontSize.sm,
              fontFamily: tokens.typography.fontFamily.sans,
              color: tokens.colors.gray.gray10,
              width: '100%',
              boxSizing: 'border-box',
            }}
            placeholder="Add a comment"
            value={draft}
            onChange={event => {
              setDraft(event.target.value);
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: eciperayTheme.semantic.primary,
              borderRadius: 8,
              border: 'none',
              paddingLeft: tokens.spacing[4],
              paddingRight: tokens.spacing[4],
              paddingTop: tokens.spacing[2],
              paddingBottom: tokens.spacing[2],
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              color: '#ffffff',
              cursor: 'pointer',
              alignSelf: 'flex-start',
              fontFamily: tokens.typography.fontFamily.sans,
            }}
            disabled={createMutation.isPending || !draft.trim()}
          >
            Post comment
          </button>
        </form>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.gray.gray7,
          }}
        >
          Sign in to join the conversation
        </p>
      )}
    </div>
  );
};
