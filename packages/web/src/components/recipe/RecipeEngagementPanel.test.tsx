import {screen, waitFor} from '@testing-library/react';

import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeEngagementPanel} from './RecipeEngagementPanel.js';

describe('RecipeEngagementPanel', () => {
  test('renders ratings and comments sections', async () => {
    await renderWithProviders(
      <RecipeEngagementPanel
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
        communityRating={{average: 4, count: 2, hasStaleRatings: false}}
        viewerRating={5}
        viewerRatingIsStale={false}
        editableRatings
      />,
      {withAuth: true},
    );

    await waitFor(() => {
      expect(screen.getByText('Community rating')).toBeInTheDocument();
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });
  });
});
