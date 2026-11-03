import {STALE_COMMENT_HINT} from '@eciperay/client';
import type {RecipeComment} from '@eciperay/types';
import {eciperayTheme, TextAction, tokens} from '@spudly/ui';
import type {CSSProperties} from 'react';
import {useState} from 'react';

import {StaleVersionHint} from './StaleVersionHint.js';

const formatAuthorName = (comment: RecipeComment) =>
  comment.authorDisplayName?.trim() ?? 'Anonymous';

type Props = {
  comment: RecipeComment;
  currentUserId?: string;
  ownerUserId?: string;
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

// Style objects on DS tokens (B7 C12, design-system#130 — the Tailwind
// utilities these replace are gone with the dependency).
const itemStyle: CSSProperties = {
  borderRadius: 8,
  backgroundColor: tokens.colors.gray.gray1,
  padding: tokens.spacing[3],
  listStyle: 'none',
};

const headerStyle: CSSProperties = {
  marginBottom: tokens.spacing[1],
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing[2],
};

const authorStyle: CSSProperties = {
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  color: tokens.colors.gray.gray10,
};

const editFieldStyle: CSSProperties = {
  marginBottom: tokens.spacing[2],
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
};

const bodyStyle: CSSProperties = {
  fontSize: tokens.typography.fontSize.sm,
  whiteSpace: 'pre-wrap',
  color: tokens.colors.gray.gray8,
  margin: 0,
};

const actionsStyle: CSSProperties = {
  marginTop: tokens.spacing[2],
  display: 'flex',
  gap: tokens.spacing[3],
  fontSize: tokens.typography.fontSize.xs,
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
    <li style={itemStyle}>
      <div style={headerStyle}>
        <span style={authorStyle}>{formatAuthorName(comment)}</span>
        {comment.isStale ? (
          <StaleVersionHint label={STALE_COMMENT_HINT} />
        ) : null}
      </div>
      {isEditing ? (
        <textarea
          style={editFieldStyle}
          value={editDraft}
          onChange={event => {
            onEditDraftChange(event.target.value);
          }}
        />
      ) : (
        <p style={bodyStyle}>{comment.body}</p>
      )}
      {canModerate ? (
        <div style={actionsStyle}>
          {isAuthor ? (
            isEditing ? (
              <>
                <TextAction
                  fontSize={tokens.typography.fontSize.xs}
                  color="$primary"
                  fontWeight={500}
                  disabled={isUpdatePending || !editDraft.trim()}
                  onPress={onSaveEdit}
                >
                  Save
                </TextAction>
                <TextAction
                  fontSize={tokens.typography.fontSize.xs}
                  color={tokens.colors.gray.gray7}
                  onPress={onCancelEdit}
                >
                  Cancel
                </TextAction>
              </>
            ) : (
              <TextAction
                  fontSize={tokens.typography.fontSize.xs}
                color="$primary"
                fontWeight={500}
                onPress={onStartEdit}
              >
                Edit
              </TextAction>
            )
          ) : null}
          <TextAction
                  fontSize={tokens.typography.fontSize.xs}
            color={tokens.colors.danger.danger7}
            disabled={isDeletePending}
            onPress={onDelete}
          >
            Delete
          </TextAction>
        </div>
      ) : null}
    </li>
  );
};

if (import.meta.env.DEV) {
  RecipeCommentItem.demo = function RecipeCommentItemDemo() {
    const mockRecipeComment = {
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
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(mockRecipeComment.body);

    return (
      <ul>
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
      </ul>
    );
  };
}
