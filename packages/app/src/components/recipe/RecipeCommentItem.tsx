import {STALE_COMMENT_HINT} from '@eciperay/client';
import type {RecipeComment} from '@eciperay/types';
import React from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';

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
    <View className="mb-3 rounded-lg bg-gray-50 p-3">
      <View className="mb-1 flex-row items-center gap-2">
        <Text className="text-sm font-medium text-gray-900">
          {formatAuthorName(comment)}
        </Text>
        {comment.isStale ? (
          <StaleVersionHint label={STALE_COMMENT_HINT} />
        ) : null}
      </View>
      {isEditing ? (
        <TextInput
          className="
            mb-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
          "
          multiline
          value={editDraft}
          onChangeText={onEditDraftChange}
        />
      ) : (
        <Text className="text-sm text-gray-700">{comment.body}</Text>
      )}
      {canModerate ? (
        <View className="mt-2 flex-row gap-3">
          {isAuthor ? (
            isEditing ? (
              <>
                <TouchableOpacity
                  disabled={isUpdatePending || !editDraft.trim()}
                  onPress={onSaveEdit}
                >
                  <Text className="text-primary text-xs font-medium">Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onCancelEdit}>
                  <Text className="text-xs text-gray-600">Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={onStartEdit}>
                <Text className="text-primary text-xs font-medium">Edit</Text>
              </TouchableOpacity>
            )
          ) : null}
          <TouchableOpacity
            disabled={isDeletePending}
            onPress={onDelete}
          >
            <Text className="text-xs text-red-600">Delete</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};
