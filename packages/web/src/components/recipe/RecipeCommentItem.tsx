import {STALE_COMMENT_HINT} from '@eciperay/client';
import type {RecipeComment} from '@eciperay/types';

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
    <li className="rounded-lg bg-gray-50 p-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">
          {formatAuthorName(comment)}
        </span>
        {comment.isStale ? (
          <StaleVersionHint label={STALE_COMMENT_HINT} />
        ) : null}
      </div>
      {isEditing ? (
        <textarea
          className="
            mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
          "
          value={editDraft}
          onChange={event => {
            onEditDraftChange(event.target.value);
          }}
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm text-gray-700">
          {comment.body}
        </p>
      )}
      {canModerate ? (
        <div className="mt-2 flex gap-3 text-xs">
          {isAuthor ? (
            isEditing ? (
              <>
                <button
                  type="button"
                  className="text-primary font-medium"
                  disabled={isUpdatePending || !editDraft.trim()}
                  onClick={onSaveEdit}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="text-gray-600"
                  onClick={onCancelEdit}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-primary font-medium"
                onClick={onStartEdit}
              >
                Edit
              </button>
            )
          ) : null}
          <button
            type="button"
            className="text-red-600"
            disabled={isDeletePending}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      ) : null}
    </li>
  );
};
