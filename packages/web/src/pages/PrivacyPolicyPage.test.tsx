import {LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_NAME} from '@eciperay/client';
import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {PrivacyPolicyPage} from './PrivacyPolicyPage.js';

describe('PrivacyPolicyPage', () => {
  test('renders policy content without requiring auth', async () => {
    await renderWithProviders(<PrivacyPolicyPage />, {withAuth: false});
    expect(
      screen.getByRole('heading', {name: 'Privacy Policy'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {name: 'Information we collect'}),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(LEGAL_OPERATOR_NAME)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not a registered legal entity/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', {name: LEGAL_CONTACT_EMAIL}),
    ).toHaveLength(2);
  });
});
