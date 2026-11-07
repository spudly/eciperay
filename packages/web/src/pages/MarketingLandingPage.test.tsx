import {
  LANDING_DISCOVER_CTA,
  LANDING_HERO_TITLE,
  LANDING_MOBILE_APP_CTA,
  LANDING_SIGNUP_CTA,
  MOBILE_APP_INSTALL_URL,
} from '@eciperay/client';
import {screen, within} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {MarketingLandingPage} from './MarketingLandingPage.js';

describe('MarketingLandingPage', () => {
  test('renders value prop, CTAs, and legal footer links', async () => {
    await renderWithProviders(<MarketingLandingPage />, {withAuth: false});
    expect(screen.getByText(LANDING_HERO_TITLE)).toBeInTheDocument();
    // The header the retired DS frame supplied is host chrome now
    // (#452): the brand wordmark links home and Sign in links to
    // the login route.
    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('link', {name: 'Eciperay'})).toHaveAttribute(
      'href',
      '/',
    );
    expect(header.getByRole('link', {name: 'Sign in'})).toHaveAttribute(
      'href',
      '/login',
    );
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
    // Regression (#425): the signed-out public footer must carry all
    // three legal links — the DS page's default footer omits Do Not
    // Sell, so the host passes the shared footer data explicitly.
    expect(
      screen.getByRole('link', {
        name: 'Do Not Sell or Share My Personal Information',
      }),
    ).toHaveAttribute('href', '/privacy/consent');
    expect(screen.getByText('Import from anywhere')).toBeInTheDocument();
  });
});
