import {
  LANDING_DISCOVER_CTA,
  LANDING_HERO_TITLE,
  LANDING_MOBILE_APP_CTA,
  LANDING_SIGNUP_CTA,
  MOBILE_APP_INSTALL_URL,
} from '@eciperay/client';
import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {MarketingLandingPage} from './MarketingLandingPage.js';

describe('MarketingLandingPage', () => {
  test('renders the hero title from the en-XA Lingui catalog (#465)', async () => {
    await renderWithProviders(<MarketingLandingPage />, {
      withAuth: false,
      locale: 'en-XA',
    });
    expect(
      screen.getByText(
        'Every recipe you love, in one place — ready when you are~',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {name: 'Discover public recipes~'}),
    ).toHaveAttribute('href', '/recipes');
    expect(screen.getByText('Import from anywhere~')).toBeInTheDocument();
  });

  test('renders value prop and CTAs', async () => {
    await renderWithProviders(<MarketingLandingPage />, {withAuth: false});
    expect(screen.getByText(LANDING_HERO_TITLE)).toBeInTheDocument();
    // The header and footer are no longer this page's concern
    // (#620): HomeEntry renders the landing inside the one AppShell,
    // whose DS AppShellPage chrome supplies the brand mark, the
    // Sign in action, and the shared BigFooter with its legal links
    // (#425) — those assertions live in HomeEntry.test.tsx and
    // AppShell.test.tsx.
    expect(
      screen.getByRole('link', {name: LANDING_DISCOVER_CTA}),
    ).toHaveAttribute('href', '/recipes');
    expect(
      screen.getByRole('link', {name: LANDING_SIGNUP_CTA}),
    ).toHaveAttribute('href', '/signup');
    expect(
      screen.getByRole('link', {name: LANDING_MOBILE_APP_CTA}),
    ).toHaveAttribute('href', MOBILE_APP_INSTALL_URL);
    expect(screen.getByText('Import from anywhere')).toBeInTheDocument();
  });
});
