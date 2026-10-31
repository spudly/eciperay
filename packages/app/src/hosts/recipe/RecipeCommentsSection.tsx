/* eslint-disable max-lines -- comments section with compose form */
import {
  makeRecipeDetail,
  queryKeys,
  STALE_COMMENT_HINT,
  useAuth,
} from '@eciperay/client';
import {
  Button as DsButton,
  Card as DsCard,
  CommentItem as DsCommentItem,
  TextAreaField as DsTextAreaField,
  Text as DsText,
  tokens,
} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {YStack} from 'tamagui';

import {api} from '../../lib/api';
import {BookLoadingSpinner} from '../../components/ui/BookLoadingSpinner';

type Props = {recipeId: string; ownerUserId: string};

// Field backgrounds (issue #167): fields here render through @spudly/ui
// components, which all share the Warm Harvest $surface field background.
// The web mirror matches via its bg-field token (#fffdf8, the same surface).
export const RecipeCommentsSection = ({recipeId, ownerUserId}: Props) => {
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = session?.user.id;
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const commentsQueryKey = queryKeys.recipeComments(recipeId);

  const {data, isLoading} = useQuery({
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

  return (
    <DsCard
      variant="bordered"
      marginBlockEnd="$4"
    >
      <DsText
        marginBlockEnd="$3"
        fontSize={tokens.typography.fontSize.sm}
        fontWeight={tokens.typography.fontWeight.semibold}
        color={tokens.colors.gray.gray10}
      >
        Comments
      </DsText>
      {isLoading ? (
        <YStack
          alignItems="center"
          justifyContent="center"
          marginBlockEnd="$3"
        >
          <BookLoadingSpinner size="sm" />
        </YStack>
      ) : null}
      {!isLoading && comments.length === 0 ? (
        <DsText
          marginBlockEnd="$3"
          fontSize={tokens.typography.fontSize.sm}
          color={tokens.colors.gray.gray7}
        >
          No comments yet
        </DsText>
      ) : null}
      {comments.map(comment => (
        <DsCommentItem
          key={comment.id}
          authorName={comment.authorDisplayName?.trim() ?? 'Anonymous'}
          body={comment.body}
          isStale={comment.isStale}
          staleHintLabel={STALE_COMMENT_HINT}
          canEdit={comment.authorUserId === currentUserId}
          canDelete={
            comment.authorUserId === currentUserId ||
            ownerUserId === currentUserId
          }
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
      {currentUserId ? (
        <YStack>
          <DsTextAreaField
            marginBlockEnd="$2"
            placeholder="Add a comment"
            value={draft}
            onChangeText={setDraft}
          />
          <DsButton
            variant="primary"
            size="sm"
            alignSelf="flex-start"
            disabled={createMutation.isPending || !draft.trim()}
            onPress={() => {
              createMutation.mutate(draft.trim());
            }}
          >
            Post comment
          </DsButton>
        </YStack>
      ) : null}
    </DsCard>
  );
};
