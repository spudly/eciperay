/* eslint-disable max-lines -- comment item with edit-state actions and showcase demo */
import {STALE_COMMENT_HINT} from '@eciperay/client';
import type {RecipeComment} from '@eciperay/types';
import {
  MultilineField as DsMultilineField,
  Text as DsText,
  tokens,
} from '@spudly/ui';
import React, {useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {XStack, YStack} from 'tamagui';

import {StaleVersionHint} from './StaleVersionHint';

const formatAuthorName = (comment: RecipeComment) =>
  comment.authorDisplayName?.trim() ?? 'Anonymous';

type Props = {
  comment: RecipeComment;
  currentUserId?: string;
  ownerUserId: string;
  isEditing: boolean;
  editDraft: string;
  isUpdatePending: boolean;
  isDeletePending: boolean;
  onEditDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
};

export const RecipeCommentItem = ({
  comment,
  currentUserId,
  ownerUserId,
  isEditing,
  editDraft,
  isUpdatePending,
  isDeletePending,
  onEditDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: Props) => {
  const isAuthor = comment.authorUserId === currentUserId;
  const canModerate = isAuthor || ownerUserId === currentUserId;

  return (
    <YStack
      marginBlockEnd="$3"
      borderRadius={tokens.radii.md}
      backgroundColor={tokens.colors.gray.gray1}
      padding="$3"
    >
      <XStack
        marginBlockEnd="$1"
        alignItems="center"
        gap="$2"
      >
        <DsText
          fontSize={tokens.typography.fontSize.sm}
          fontWeight={tokens.typography.fontWeight.medium}
          color={tokens.colors.gray.gray10}
        >
          {formatAuthorName(comment)}
        </DsText>
        {comment.isStale ? (
          <StaleVersionHint label={STALE_COMMENT_HINT} />
        ) : null}
      </XStack>
      {isEditing ? (
        <DsMultilineField
          marginBlockEnd="$2"
          value={editDraft}
          onChangeText={onEditDraftChange}
        />
      ) : (
        <DsText
          fontSize={tokens.typography.fontSize.sm}
          color={tokens.colors.gray.gray8}
        >
          {comment.body}
        </DsText>
      )}
      {canModerate ? (
        <XStack
          marginBlockStart="$2"
          gap="$3"
        >
          {isAuthor ? (
            isEditing ? (
              <>
                <TouchableOpacity
                  disabled={isUpdatePending || !editDraft.trim()}
                  onPress={onSaveEdit}
                >
                  <DsText
                    color="$primary"
                    fontSize={tokens.typography.fontSize.xs}
                    fontWeight={tokens.typography.fontWeight.medium}
                  >
                    Save
                  </DsText>
                </TouchableOpacity>
                <TouchableOpacity onPress={onCancelEdit}>
                  <DsText
                    fontSize={tokens.typography.fontSize.xs}
                    color={tokens.colors.gray.gray7}
                  >
                    Cancel
                  </DsText>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={onStartEdit}>
                <DsText
                  color="$primary"
                  fontSize={tokens.typography.fontSize.xs}
                  fontWeight={tokens.typography.fontWeight.medium}
                >
                  Edit
                </DsText>
              </TouchableOpacity>
            )
          ) : null}
          <TouchableOpacity
            disabled={isDeletePending}
            onPress={onDelete}
          >
            <DsText
              fontSize={tokens.typography.fontSize.xs}
              color={tokens.colors.danger.danger7}
            >
              Delete
            </DsText>
          </TouchableOpacity>
        </XStack>
      ) : null}
    </YStack>
  );
};

if (__DEV__) {
  const mockRecipeComment: RecipeComment = {
    id: 'comment-1',
    recipeId: 'recipe-uuid-1',
    authorUserId: 'user-uuid-1',
    authorDisplayName: 'Chef Demo',
    body: 'Doubled the garlic — excellent.',
    contentRevision: 1,
    isStale: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const RecipeCommentItemDemo = () => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(mockRecipeComment.body);

    return (
      <View>
        <RecipeCommentItem
          comment={mockRecipeComment}
          currentUserId="user-uuid-1"
          ownerUserId="user-uuid-1"
          isEditing={editing}
          editDraft={draft}
          isUpdatePending={false}
          isDeletePending={false}
          onEditDraftChange={setDraft}
          onStartEdit={() => {
            setEditing(true);
          }}
          onCancelEdit={() => {
            setEditing(false);
          }}
          onSaveEdit={() => {
            setEditing(false);
          }}
          onDelete={() => {
            void 0;
          }}
        />
      </View>
    );
  };

  RecipeCommentItem.demo = () => <RecipeCommentItemDemo />;
}
