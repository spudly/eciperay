import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {DraftReviewCard} from './DraftReviewCard';

jest.mock('../../lib/api');

const mockApprove = api.drafts.approve as jest.Mock;
const mockReject = api.drafts.reject as jest.Mock;

const draft = {
  id: 'draft-1',
  recipeId: 'recipe-uuid-1',
  status: 'pending' as const,
  snapshotJson: makeRecipeDetail(),
  diffJson: {},
  trigger: 'ai_chat' as const,
  summaryOfChanges: 'Added garlic',
  createdAt: '2024-01-01',
};

describe('DraftReviewCard', () => {
  beforeEach(() => {
    mockApprove.mockImplementation(async () => {});
    mockReject.mockImplementation(async () => {});
  });

  test('renders draft and approves', async () => {
    const {getByText} = render(
      renderWithProviders(
        <DraftReviewCard
          recipeId="recipe-uuid-1"
          draft={draft}
        />,
      ),
    );
    expect(getByText('Added garlic')).toBeTruthy();
    fireEvent.press(getByText('Approve'));
    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith('recipe-uuid-1', 'draft-1');
    });
  });

  test('rejects draft', async () => {
    const {getByText} = render(
      renderWithProviders(
        <DraftReviewCard
          recipeId="recipe-uuid-1"
          draft={draft}
        />,
      ),
    );
    fireEvent.press(getByText('Reject'));
    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith('recipe-uuid-1', 'draft-1');
    });
  });
});
