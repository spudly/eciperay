import type {Entitlement} from '@eciperay/types';
import {screen} from '@testing-library/react';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {ProfileAccessTokensSection} from './ProfileAccessTokensSection.js';

const makeEntitlement = (plan: Entitlement['plan']): Entitlement => ({
  plan,
  status: plan === 'free' ? null : 'active',
  aiUsed: 0,
  aiLimit: 100,
  periodEndsAt: null,
  paddleCustomerId: null,
  cancelAtPeriodEnd: false,
});

describe('ProfileAccessTokensSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTokens = () => {
    vi.spyOn(eciperay.account, 'listPersonalAccessTokens').mockResolvedValue(
      [],
    );
  };

  test('shows the create form for a Power user', async () => {
    mockTokens();
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      makeEntitlement('power'),
    );
    await renderWithProviders(<ProfileAccessTokensSection />, {
      withAuth: false,
    });
    expect(
      await screen.findByRole('button', {name: 'Create token'}),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/API access tokens are a Power feature/),
    ).not.toBeInTheDocument();
  });

  test('shows the Power explainer instead of the form for a Free user', async () => {
    mockTokens();
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      makeEntitlement('free'),
    );
    await renderWithProviders(<ProfileAccessTokensSection />, {
      withAuth: false,
    });
    expect(
      await screen.findByText(/API access tokens are a Power feature/),
    ).toBeInTheDocument();
    expect(screen.getByText(/You're on the Free plan/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Create token'}),
    ).not.toBeInTheDocument();
  });

  test('renders token meta from the en-XA Lingui catalog (#465)', async () => {
    vi.spyOn(eciperay.account, 'listPersonalAccessTokens').mockResolvedValue([
      {
        id: 'token-1',
        name: 'My token',
        tokenPrefix: 'eci_abc',
        createdAt: '2026-01-02T00:00:00.000Z',
        lastUsedAt: null,
        revokedAt: null,
      } as never,
    ]);
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      makeEntitlement('power'),
    );
    await renderWithProviders(<ProfileAccessTokensSection />, {
      withAuth: false,
      locale: 'en-XA',
    });
    // The full-line anchor requires the pseudo-locale marker on both
    // the created and never-used labels; English metadata fails it.
    expect(
      await screen.findByText(/^Created [^~]+~ · Never used~$/),
    ).toBeInTheDocument();
  });

  test('falls back to the form when the entitlement fails to load', async () => {
    mockTokens();
    vi.spyOn(eciperay.account, 'getEntitlement').mockRejectedValue(
      new Error('entitlement down'),
    );
    await renderWithProviders(<ProfileAccessTokensSection />, {
      withAuth: false,
    });
    expect(
      await screen.findByRole('button', {name: 'Create token'}),
    ).toBeInTheDocument();
  });
});
