import {LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_NAME} from '@eciperay/client';
import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {TermsOfServicePage} from './TermsOfServicePage.js';

describe('TermsOfServicePage', () => {
  test('renders the title from the en-XA Lingui catalog (#465)', async () => {
    await renderWithProviders(<TermsOfServicePage />, {
      withAuth: false,
      locale: 'en-XA',
    });
    expect(
      screen.getByRole('heading', {name: 'Terms of Service~'}),
    ).toBeInTheDocument();
  });

  test('renders terms content without requiring auth', async () => {
    await renderWithProviders(<TermsOfServicePage />, {withAuth: false});
    expect(
      screen.getByRole('heading', {name: 'Terms of Service'}),
    ).toBeInTheDocument();
    expect(screen.getByText(/Your content/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(new RegExp(LEGAL_OPERATOR_NAME)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', {name: LEGAL_CONTACT_EMAIL}),
    ).toHaveLength(2);
  });
});
