import {LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_NAME} from '@eciperay/client';
import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {PrivacyPolicyPage} from './PrivacyPolicyPage.js';

describe('PrivacyPolicyPage', () => {
  test('renders the title from the en-XA Lingui catalog (#465)', async () => {
    await renderWithProviders(<PrivacyPolicyPage />, {
      withAuth: false,
      locale: 'en-XA',
    });
    expect(
      screen.getByRole('heading', {name: 'Privacy Policy~'}),
    ).toBeInTheDocument();
    // Tranche 21: section bodies flow through the catalogs too —
    // the pseudo-localized section heading and body copy prove the
    // structured content is catalog-resolved, not hardcoded.
    expect(
      screen.getByRole('heading', {name: 'Information we collect~'}),
    ).toBeInTheDocument();
    expect(screen.getByText(/Account information:~?/)).toBeInTheDocument();
  });

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
    ).toHaveLength(3);
    expect(
      screen.getAllByText(/Voluntary product feedback/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Feedback shortcut preference/i),
    ).toBeInTheDocument();
  });
});
