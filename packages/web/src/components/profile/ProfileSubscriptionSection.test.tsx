import type {Entitlement} from '@eciperay/types';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {ProfileSubscriptionSection} from './ProfileSubscriptionSection.js';

const plusEntitlement: Entitlement = {
  plan: 'plus',
  status: 'active',
  aiUsed: 3,
  aiLimit: 200,
  periodEndsAt: '2026-11-16T12:00:00.000Z',
  paddleCustomerId: 'ctm_123',
};

describe('ProfileSubscriptionSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('loads and displays the entitlement', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    expect(await screen.findByText('Plus plan')).toBeInTheDocument();
    expect(
      screen.getByText('Active — renews Nov 16, 2026'),
    ).toBeInTheDocument();
  });

  test('manage subscription opens the portal link in a new tab', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    vi.spyOn(eciperay.billing, 'createPortalLink').mockResolvedValue({
      url: 'https://portal.example/session',
    });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    expect(open).toHaveBeenCalledWith(
      'https://portal.example/session',
      '_blank',
      'noopener,noreferrer',
    );
  });

  test('shows an error when the entitlement fails to load', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockRejectedValue(
      new Error('boom'),
    );
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  test('shows an error when the portal link fails', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    vi.spyOn(eciperay.billing, 'createPortalLink').mockRejectedValue(
      new Error('portal down'),
    );
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    expect(await screen.findByText('portal down')).toBeInTheDocument();
  });
});
