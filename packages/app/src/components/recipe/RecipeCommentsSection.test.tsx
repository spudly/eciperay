import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';
import {STALE_COMMENT_HINT, useAuth} from '@eciperay/client';

import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {RecipeCommentsSection} from './RecipeCommentsSection';

jest.mock('../../lib/api');
jest.mock('@eciperay/client', () => ({
  ...jest.requireActual('@eciperay/client'),
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockListComments = api.recipes.listComments as jest.Mock;
const mockCreateComment = api.recipes.createComment as jest.Mock;
const mockUpdateComment = api.recipes.updateComment as jest.Mock;
const mockDeleteComment = api.recipes.deleteComment as jest.Mock;

const sampleComment = {
  id: 'comment-1',
  recipeId: 'recipe-uuid-1',
  authorUserId: 'user-uuid-1',
  authorDisplayName: 'Alex',
  body: 'Great!',
  contentRevision: 1,
  isStale: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('RecipeCommentsSection', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-uuid-1', email: 'test@example.com'}},
    });
    mockListComments.mockResolvedValue([sampleComment]);
    mockCreateComment.mockResolvedValue(sampleComment);
    mockUpdateComment.mockResolvedValue({
      ...sampleComment,
      body: 'Updated',
      isStale: false,
    });
    mockDeleteComment.mockResolvedValue(undefined);
  });

  test('renders comments with stale badges', async () => {
    const {findByText, getByLabelText} = renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
    );
    expect(await findByText('Great!')).toBeTruthy();
    expect(getByLabelText(STALE_COMMENT_HINT)).toBeTruthy();
  });

  test('renders loading, empty, and anonymous author states', async () => {
    mockListComments.mockImplementation(() => new Promise(() => {}));
    const loading = renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
    );
    expect(loading.getByText('Loading comments…')).toBeTruthy();

    mockListComments.mockResolvedValue([]);
    const empty = renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
    );
    expect(await empty.findByText('No comments yet')).toBeTruthy();

    mockListComments.mockResolvedValue([
      {...sampleComment, authorDisplayName: null, isStale: false},
    ]);
    const anonymous = renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
    );
    expect(await anonymous.findByText('Anonymous')).toBeTruthy();
  });

  test('lets owners delete comments they did not author', async () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'owner-uuid', email: 'owner@example.com'}},
    });
    mockListComments.mockResolvedValue([
      {...sampleComment, authorUserId: 'other-user', isStale: false},
    ]);

    const {findByText} = renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
    );

    fireEvent.press(await findByText('Delete'));
    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'comment-1',
      );
    });
  });

  test('hides actions for viewers who cannot moderate', async () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'viewer-uuid', email: 'viewer@example.com'}},
    });
    mockListComments.mockResolvedValue([
      {...sampleComment, authorUserId: 'other-user', isStale: false},
    ]);

    const {findByText, queryByText} = renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
    );

    expect(await findByText('Great!')).toBeTruthy();
    expect(queryByText('Edit')).toBeNull();
    expect(queryByText('Delete')).toBeNull();
  });

  test('posts, edits, and deletes comments', async () => {
    const {getByPlaceholderText, getByText, getByDisplayValue} =
      renderWithProviders(
        <RecipeCommentsSection
          recipeId="recipe-uuid-1"
          ownerUserId="owner-uuid"
        />,
      );

    await waitFor(() => {
      expect(getByText('Great!')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Add a comment'), 'Nice!');
    fireEvent.press(getByText('Post comment'));
    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith('recipe-uuid-1', {
        body: 'Nice!',
      });
    });

    fireEvent.press(getByText('Edit'));
    fireEvent.press(getByText('Cancel'));
    expect(getByText('Great!')).toBeTruthy();

    fireEvent.press(getByText('Edit'));
    fireEvent.changeText(getByDisplayValue('Great!'), 'Updated');
    fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(mockUpdateComment).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'comment-1',
        {body: 'Updated'},
      );
    });

    fireEvent.press(getByText('Delete'));
    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'comment-1',
      );
    });
  });
});
