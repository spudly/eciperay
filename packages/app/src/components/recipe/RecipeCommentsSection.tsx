/* eslint-disable max-lines -- comments section with compose form and showcase demo */
import {
  makeRecipeDetail,
  queryKeys,
  useAuth,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {
  Button as DsButton,
  Card as DsCard,
  MultilineField as DsMultilineField,
  Text as DsText,
  tokens,
} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {YStack} from 'tamagui';

import {api} from '../../lib/api';
import {BookLoadingSpinner} from '../ui/BookLoadingSpinner';

import {RecipeCommentItem} from './RecipeCommentItem';

type Props = {recipeId: string; ownerUserId: string};

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
      {currentUserId ? (
        <YStack>
          <DsMultilineField
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

if (__DEV__) {
  const recipeCommentsSectionDemo: ShowcaseDemoRenderer = ({Frame}) => {
    const recipe = makeRecipeDetail();
    return (
      <Frame>
        <RecipeCommentsSection
          recipeId={recipe.id}
          ownerUserId={recipe.userId}
        />
      </Frame>
    );
  };
  RecipeCommentsSection.demo = recipeCommentsSectionDemo;
}
