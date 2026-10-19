import type {Entitlement} from '@eciperay/types';
import {focusManager} from '@tanstack/react-query';
import {act, screen} from '@testing-library/react';
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
  cancelAtPeriodEnd: false,
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

  test('refetches the entitlement on window focus even while the cached entry is fresh', async () => {
    const getEntitlement = vi
      .spyOn(eciperay.account, 'getEntitlement')
      .mockResolvedValue(plusEntitlement);
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    expect(
      await screen.findByText('Active — renews Nov 16, 2026'),
    ).toBeInTheDocument();
    // The user changes the subscription in the portal and returns
    // while the cached entitlement is still fresh (the test client
    // uses staleTime: Infinity): focus must refetch anyway, or the
    // profile keeps showing the pre-portal plan/status.
    getEntitlement.mockResolvedValue({
      ...plusEntitlement,
      cancelAtPeriodEnd: true,
    });
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    expect(
      await screen.findByText('Cancelling — access until Nov 16, 2026'),
    ).toBeInTheDocument();
    expect(getEntitlement).toHaveBeenCalledTimes(2);
  });

  test('reconciles a delayed webhook update without another focus event', async () => {
    const freeEntitlement: Entitlement = {
      plan: 'free',
      status: null,
      aiUsed: 0,
      aiLimit: 25,
      periodEndsAt: null,
      paddleCustomerId: null,
      cancelAtPeriodEnd: false,
    };
    // The first fetch beats the checkout webhook and returns the old
    // (free) entitlement; the webhook then lands, but no further focus
    // event occurs while the profile stays open. The bounded
    // reconciliation cycle must refetch on its own and pick the new
    // plan up.
    const getEntitlement = vi
      .spyOn(eciperay.account, 'getEntitlement')
      .mockResolvedValueOnce(freeEntitlement)
      .mockResolvedValue(plusEntitlement);
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    expect(await screen.findByText('Free plan')).toBeInTheDocument();
    expect(
      await screen.findByText('Plus plan', undefined, {timeout: 6000}),
    ).toBeInTheDocument();
    expect(getEntitlement.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('manage subscription pre-opens a tab and navigates it to the portal link', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    let resolvePortal!: (value: {url: string}) => void;
    vi.spyOn(eciperay.billing, 'createPortalLink').mockImplementation(
      () =>
        new Promise<{url: string}>(resolve => {
          resolvePortal = resolve;
        }),
    );
    const portalTab = {
      closed: false,
      opener: {} as unknown,
      location: {href: ''},
      close: vi.fn(),
    };
    const open = vi
      .spyOn(window, 'open')
      .mockImplementation(() => portalTab as unknown as Window);
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    // The tab opens synchronously on click, before the request resolves,
    // so the browser's popup blocker cannot eat it.
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(portalTab.location.href).toBe('');
    resolvePortal({url: 'https://portal.example/session'});
    await screen.findByRole('button', {name: 'Manage subscription'});
    expect(portalTab.location.href).toBe('https://portal.example/session');
    expect(portalTab.opener).toBeNull();
    expect(portalTab.close).not.toHaveBeenCalled();
  });

  test('shows a clickable portal link when the pre-opened tab is blocked', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    vi.spyOn(eciperay.billing, 'createPortalLink').mockResolvedValue({
      url: 'https://portal.example/session',
    });
    vi.spyOn(window, 'open').mockImplementation(() => null);
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    const link = await screen.findByRole('link', {
      name: 'Open subscription portal',
    });
    expect(link).toHaveAttribute('href', 'https://portal.example/session');
  });

  test('check again reconciles with the server and shows the new plan', async () => {
    const freeEntitlement: Entitlement = {
      plan: 'free',
      status: null,
      aiUsed: 0,
      aiLimit: 25,
      periodEndsAt: null,
      paddleCustomerId: null,
      cancelAtPeriodEnd: false,
    };
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      freeEntitlement,
    );
    const refresh = vi
      .spyOn(eciperay.account, 'refreshEntitlement')
      .mockResolvedValue(plusEntitlement);
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    expect(await screen.findByText('Free plan')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Check again'}));
    expect(await screen.findByText('Plus plan')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('check again surfaces a refresh failure', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    vi.spyOn(eciperay.account, 'refreshEntitlement').mockRejectedValue(
      new Error('billing not configured'),
    );
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    await userEvent.click(
      await screen.findByRole('button', {name: 'Check again'}),
    );
    expect(
      await screen.findByText('billing not configured'),
    ).toBeInTheDocument();
  });

  test('does not show the checking hint while idle', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    expect(await screen.findByText('Plus plan')).toBeInTheDocument();
    expect(
      screen.queryByText('Checking for the latest subscription status…'),
    ).not.toBeInTheDocument();
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

  test('shows an error and closes the pre-opened tab when the portal link fails', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    vi.spyOn(eciperay.billing, 'createPortalLink').mockRejectedValue(
      new Error('portal down'),
    );
    const portalTab = {
      closed: false,
      opener: null,
      location: {href: ''},
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockImplementation(
      () => portalTab as unknown as Window,
    );
    await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    expect(await screen.findByText('portal down')).toBeInTheDocument();
    expect(portalTab.close).toHaveBeenCalledTimes(1);
  });

  test('navigates the pre-opened tab even when unmounted while the portal request is pending', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    let resolvePortal!: (value: {url: string}) => void;
    vi.spyOn(eciperay.billing, 'createPortalLink').mockImplementation(
      () =>
        new Promise<{url: string}>(resolve => {
          resolvePortal = resolve;
        }),
    );
    const portalTab = {
      closed: false,
      opener: {} as unknown,
      location: {href: ''},
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockImplementation(
      () => portalTab as unknown as Window,
    );
    const view = await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    // Leaving /profile mid-request must not strand the blank tab:
    // per-call mutate callbacks are skipped after unmount, so the tab
    // is driven from the mutateAsync promise instead.
    view.unmount();
    await act(async () => {
      resolvePortal({url: 'https://portal.example/session'});
    });
    expect(portalTab.location.href).toBe('https://portal.example/session');
    expect(portalTab.opener).toBeNull();
    expect(portalTab.close).not.toHaveBeenCalled();
  });

  test('closes the pre-opened tab even when unmounted while the portal request is pending and then fails', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    let rejectPortal!: (reason: unknown) => void;
    vi.spyOn(eciperay.billing, 'createPortalLink').mockImplementation(
      () =>
        new Promise<{url: string}>((_, reject) => {
          rejectPortal = reject;
        }),
    );
    const portalTab = {
      closed: false,
      opener: null,
      location: {href: ''},
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockImplementation(
      () => portalTab as unknown as Window,
    );
    const view = await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
    });
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    view.unmount();
    await act(async () => {
      rejectPortal(new Error('portal down'));
    });
    expect(portalTab.close).toHaveBeenCalledTimes(1);
    expect(portalTab.location.href).toBe('');
  });
});
