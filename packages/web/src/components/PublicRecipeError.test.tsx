import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {PublicRecipeError} from './PublicRecipeError.js';

describe('PublicRecipeError', () => {
  test('renders an error message inside the public layout', async () => {
    await renderWithProviders(
      <PublicRecipeError
        title="Recipe not found"
        message="This recipe may be private or no longer available."
      />,
      {withAuth: false},
    );
    expect(screen.getByText('Recipe not found')).toBeInTheDocument();
    expect(
      screen.getByText('This recipe may be private or no longer available.'),
    ).toBeInTheDocument();
  });
});
