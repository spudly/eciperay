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
  test('renders value prop, CTAs, and legal footer links', async () => {
    await renderWithProviders(<MarketingLandingPage />, {withAuth: false});
    expect(screen.getByText(LANDING_HERO_TITLE)).toBeInTheDocument();
    expect(
      screen.getByRole('link', {name: LANDING_DISCOVER_CTA}),
    ).toHaveAttribute('href', '/discover');
    expect(
      screen.getByRole('link', {name: LANDING_SIGNUP_CTA}),
    ).toHaveAttribute('href', '/signup');
    expect(
      screen.getByRole('link', {name: LANDING_MOBILE_APP_CTA}),
    ).toHaveAttribute('href', MOBILE_APP_INSTALL_URL);
    expect(screen.getByRole('link', {name: 'Privacy Policy'})).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(
      screen.getByRole('link', {name: 'Terms of Service'}),
    ).toHaveAttribute('href', '/terms');
    expect(screen.getByText('Import from anywhere')).toBeInTheDocument();
  });
});
