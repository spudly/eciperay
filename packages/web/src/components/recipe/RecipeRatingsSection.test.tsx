import {
  STALE_COMMUNITY_RATING_HINT,
  STALE_VIEWER_RATING_HINT,
} from '@eciperay/client';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';

import {renderWithProviders} from '../../test/testUtils.js';
import {server} from '../../test/msw/server.js';

import {RecipeRatingsSection} from './RecipeRatingsSection.js';

const API = 'http://localhost:8080';

describe('RecipeRatingsSection', () => {
  test('shows community and personal ratings separately', async () => {
    await renderWithProviders(
      <RecipeRatingsSection
        recipeId="recipe-uuid-1"
        communityRating={{average: 4.2, count: 5, hasStaleRatings: true}}
        viewerRating={3}
        viewerRatingIsStale
        editable
      />,
      {withAuth: true},
    );

    expect(screen.getByText('Community rating')).toBeInTheDocument();
    expect(screen.getByText('Your rating')).toBeInTheDocument();
    expect(screen.getByText('4.2 (5)')).toBeInTheDocument();
    expect(
      screen.getByLabelText(STALE_COMMUNITY_RATING_HINT),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(STALE_VIEWER_RATING_HINT)).toBeInTheDocument();
  });

  test('updates personal rating through the API', async () => {
    let rating = 3;
    server.use(
      http.put(`${API}/api/recipes/:id/rating`, async ({request}) => {
        const body = (await request.json()) as {stars: number};
        rating = body.stars;
        return HttpResponse.json({
          viewerRating: body.stars,
          viewerRatingIsStale: false,
          communityRating: null,
        });
      }),
    );

    await renderWithProviders(
      <RecipeRatingsSection
        recipeId="recipe-uuid-1"
        communityRating={null}
        viewerRating={rating as 3}
        viewerRatingIsStale={false}
        editable
      />,
      {withAuth: true},
    );

    await userEvent.click(screen.getByLabelText('5 stars'));
    expect(rating).toBe(5);
  });

  test('clears a personal rating and shows empty community state', async () => {
    server.use(
      http.delete(`${API}/api/recipes/:id/rating`, () =>
        HttpResponse.json({
          viewerRating: null,
          viewerRatingIsStale: false,
          communityRating: null,
        }),
      ),
    );

    await renderWithProviders(
      <RecipeRatingsSection
        recipeId="recipe-uuid-1"
        communityRating={null}
        viewerRating={3}
        viewerRatingIsStale={false}
        editable
      />,
      {withAuth: true},
    );

    expect(screen.getByText('No community ratings yet')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('3 stars'));
  });

  test('invalidates public recipe cache after rating', async () => {
    let ratedStars: number | null = null;
    server.use(
      http.put(`${API}/api/recipes/:id/rating`, async ({request}) => {
        const body = (await request.json()) as {stars: number};
        ratedStars = body.stars;
        return HttpResponse.json({
          viewerRating: body.stars,
          viewerRatingIsStale: false,
          communityRating: null,
        });
      }),
    );

    await renderWithProviders(
      <RecipeRatingsSection
        recipeId="recipe-uuid-1"
        communityRating={{average: 4, count: 1, hasStaleRatings: false}}
        viewerRating={null}
        viewerRatingIsStale={false}
        editable
        publicContext={{slug: 'test-recipe', shareToken: 'tok'}}
      />,
      {withAuth: true},
    );

    await userEvent.click(screen.getByLabelText('4 stars'));
    await waitFor(() => {
      expect(ratedStars).toBe(4);
    });
  });

  test('prompts signed-out visitors to sign in', async () => {
    await renderWithProviders(
      <RecipeRatingsSection
        recipeId="recipe-uuid-1"
        communityRating={null}
        viewerRating={null}
        viewerRatingIsStale={false}
        editable={false}
      />,
      {withAuth: false},
    );

    expect(screen.getByText('Sign in to rate this recipe')).toBeInTheDocument();
  });
});
