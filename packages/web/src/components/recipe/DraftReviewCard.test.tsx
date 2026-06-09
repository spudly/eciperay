import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {DraftReviewCard} from './DraftReviewCard.js';

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
  test('renders draft and approves', async () => {
    renderWithProviders(
      <DraftReviewCard
        recipeId="recipe-uuid-1"
        draft={draft}
      />,
    );
    expect(screen.getByText('Added garlic')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Approve'));
    await waitFor(() => {
      expect(screen.getByText('Approve')).not.toBeDisabled();
    });
  });

  test('rejects draft', async () => {
    renderWithProviders(
      <DraftReviewCard
        recipeId="recipe-uuid-1"
        draft={draft}
      />,
    );
    await userEvent.click(screen.getByText('Reject'));
    await waitFor(() => {
      expect(screen.getByText('Reject')).not.toBeDisabled();
    });
  });
});
