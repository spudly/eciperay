import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

import {RecipeEngagementPanel} from './RecipeEngagementPanel';

jest.mock('../../lib/api');

describe('RecipeEngagementPanel', () => {
  test('renders ratings and comments sections', async () => {
    const {findByText} = renderWithProviders(
      <RecipeEngagementPanel
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
        communityRating={{average: 4, count: 2, hasStaleRatings: false}}
        viewerRating={5}
        viewerRatingIsStale={false}
      />,
    );

    expect(await findByText('Community rating')).toBeTruthy();
    expect(await findByText('Comments')).toBeTruthy();
  });
});
