import {MOBILE_APP_INSTALL_URL} from '@eciperay/client';
import {screen} from '@testing-library/react';

import {renderWithProviders} from '../../test/testUtils.js';

import {PublicRecipeCtas} from './PublicRecipeCtas.js';

describe('PublicRecipeCtas', () => {
  test('renders signup, clone, and install links', async () => {
    await renderWithProviders(<PublicRecipeCtas recipeId="recipe-uuid-1" />, {
      withAuth: false,
    });

    expect(screen.getByRole('link', {name: 'Sign up free'})).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(
      screen.getByRole('link', {name: 'Clone this recipe'}),
    ).toHaveAttribute('href', '/signup?cloneRecipe=recipe-uuid-1');
    expect(
      screen.getByRole('link', {name: 'Get the mobile app'}),
    ).toHaveAttribute('href', MOBILE_APP_INSTALL_URL);
  });
});
