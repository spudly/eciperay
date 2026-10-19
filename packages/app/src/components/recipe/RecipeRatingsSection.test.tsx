import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';
import {
  STALE_COMMUNITY_RATING_HINT,
  STALE_VIEWER_RATING_HINT,
  useAuth,
} from '@eciperay/client';

import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {RecipeRatingsSection} from './RecipeRatingsSection';

jest.mock('../../lib/api');
jest.mock('@eciperay/client', () => ({
  ...jest.requireActual('@eciperay/client'),
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockPutRating = api.recipes.putRating as jest.Mock;
const mockDeleteRating = api.recipes.deleteRating as jest.Mock;

describe('RecipeRatingsSection', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-uuid-1', email: 'test@example.com'}},
    });
    mockPutRating.mockResolvedValue({
      viewerRating: 5,
      viewerRatingIsStale: false,
      communityRating: null,
    });
    mockDeleteRating.mockResolvedValue({
      viewerRating: null,
      viewerRatingIsStale: false,
      communityRating: null,
    });
  });

  test('shows dual rating labels and stale hints', async () => {
    const {getByText, getByLabelText} = await renderWithProviders(
      <RecipeRatingsSection
        recipeId="recipe-uuid-1"
        communityRating={{average: 4, count: 2, hasStaleRatings: true}}
        viewerRating={5}
        viewerRatingIsStale
      />,
    );
    expect(getByText('Community rating')).toBeTruthy();
    expect(getByText('Your rating')).toBeTruthy();
    expect(getByText('4.0 (2)')).toBeTruthy();
    expect(getByLabelText(STALE_COMMUNITY_RATING_HINT)).toBeTruthy();
    expect(getByLabelText(STALE_VIEWER_RATING_HINT)).toBeTruthy();

    const noStale = await renderWithProviders(
      <RecipeRatingsSection
        recipeId="recipe-uuid-1"
        communityRating={{average: 4, count: 2, hasStaleRatings: false}}
        viewerRating={null}
        viewerRatingIsStale={false}
      />,
    );
    expect(noStale.queryByLabelText(STALE_COMMUNITY_RATING_HINT)).toBeNull();
  });

  test('updates and clears personal ratings', async () => {
    const {getByLabelText} = await renderWithProviders(
      <RecipeRatingsSection
        recipeId="recipe-uuid-1"
        communityRating={null}
        viewerRating={3}
        viewerRatingIsStale={false}
      />,
    );

    await fireEvent.press(getByLabelText('Rate 5 out of 5 stars'));
    await waitFor(() => {
      expect(mockPutRating).toHaveBeenCalledWith('recipe-uuid-1', {stars: 5});
    });

    await fireEvent.press(getByLabelText('Rate 3 out of 5 stars'));
    await waitFor(() => {
      expect(mockDeleteRating).toHaveBeenCalledWith('recipe-uuid-1');
    });
  });
});
