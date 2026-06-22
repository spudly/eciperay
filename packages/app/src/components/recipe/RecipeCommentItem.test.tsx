import React from 'react';
import {fireEvent} from '@testing-library/react-native';
import {STALE_COMMENT_HINT} from '@eciperay/client';

import {renderWithProviders} from '../../__tests__/testUtils';

import {RecipeCommentItem} from './RecipeCommentItem';

describe('RecipeCommentItem', () => {
  const comment = {
    id: 'comment-1',
    recipeId: 'recipe-uuid-1',
    authorUserId: 'user-uuid-1',
    authorDisplayName: null,
    body: 'Great!',
    contentRevision: 1,
    isStale: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  test('renders comment content and moderation actions', () => {
    const onDelete = jest.fn();
    const {getByText, getByLabelText} = renderWithProviders(
      <RecipeCommentItem
        comment={comment}
        currentUserId="user-uuid-1"
        ownerUserId="owner-uuid"
        isEditing={false}
        editDraft=""
        isUpdatePending={false}
        isDeletePending={false}
        onEditDraftChange={jest.fn()}
        onStartEdit={jest.fn()}
        onCancelEdit={jest.fn()}
        onSaveEdit={jest.fn()}
        onDelete={onDelete}
      />,
    );

    expect(getByText('Anonymous')).toBeTruthy();
    expect(getByLabelText(STALE_COMMENT_HINT)).toBeTruthy();
    fireEvent.press(getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });
});
