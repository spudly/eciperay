import {STALE_COMMENT_HINT} from '@eciperay/client';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeCommentItem} from './RecipeCommentItem.js';

describe('RecipeCommentItem', () => {
  const comment = {
    id: 'comment-1',
    recipeId: 'recipe-uuid-1',
    authorUserId: 'user-1',
    authorDisplayName: null,
    body: 'Great!',
    contentRevision: 1,
    isStale: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  test('renders comment content and moderation actions', async () => {
    const onDelete = vi.fn();
    await renderWithProviders(
      <RecipeCommentItem
        comment={comment}
        currentUserId="user-1"
        ownerUserId="owner-uuid"
        isEditing={false}
        editDraft=""
        isUpdatePending={false}
        isDeletePending={false}
        onEditDraftChange={vi.fn()}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSaveEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('Anonymous')).toBeInTheDocument();
    expect(screen.getByLabelText(STALE_COMMENT_HINT)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });

  test('supports edit and cancel flows', async () => {
    const onSaveEdit = vi.fn();
    const onCancelEdit = vi.fn();
    const onEditDraftChange = vi.fn();

    await renderWithProviders(
      <RecipeCommentItem
        comment={comment}
        currentUserId="user-1"
        ownerUserId="owner-uuid"
        isEditing
        editDraft="Updated"
        isUpdatePending={false}
        isDeletePending={false}
        onEditDraftChange={onEditDraftChange}
        onStartEdit={vi.fn()}
        onCancelEdit={onCancelEdit}
        onSaveEdit={onSaveEdit}
        onDelete={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByText('Save'));
    expect(onSaveEdit).toHaveBeenCalled();
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancelEdit).toHaveBeenCalled();
  });

  test('hides moderation for other viewers', async () => {
    await renderWithProviders(
      <RecipeCommentItem
        comment={{...comment, authorUserId: 'other-user', isStale: false}}
        currentUserId="viewer-uuid"
        ownerUserId="owner-uuid"
        isEditing={false}
        editDraft=""
        isUpdatePending={false}
        isDeletePending={false}
        onEditDraftChange={vi.fn()}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSaveEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  test('lets owners delete without edit controls', async () => {
    const onDelete = vi.fn();
    await renderWithProviders(
      <RecipeCommentItem
        comment={{...comment, authorUserId: 'other-user', isStale: false}}
        currentUserId="owner-uuid"
        ownerUserId="owner-uuid"
        isEditing={false}
        editDraft=""
        isUpdatePending={false}
        isDeletePending={false}
        onEditDraftChange={vi.fn()}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSaveEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });
});
