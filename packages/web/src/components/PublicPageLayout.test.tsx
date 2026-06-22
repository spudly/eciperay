import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {PublicPageLayout} from './PublicPageLayout.js';

describe('PublicPageLayout', () => {
  test('renders header, content, and privacy footer without auth', async () => {
    await renderWithProviders(
      <PublicPageLayout>
        <p>Shared recipe content</p>
      </PublicPageLayout>,
      {withAuth: false},
    );

    expect(screen.getByRole('link', {name: 'Eciperay'})).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', {name: 'Sign in'})).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByText('Shared recipe content')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Privacy Policy'})).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(
      screen.getByRole('link', {name: 'Terms of Service'}),
    ).toHaveAttribute('href', '/terms');
  });
});
