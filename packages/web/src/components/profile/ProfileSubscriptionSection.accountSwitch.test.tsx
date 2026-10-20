import {queryKeys} from '@eciperay/client';
import type {Entitlement} from '@eciperay/types';
import {QueryClient} from '@tanstack/react-query';
import {act, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {ProfileSubscriptionSection} from './ProfileSubscriptionSection.js';

// A controllable session: the account can switch mid-test while the
// component stays mounted, mirroring a sign-out/sign-in in the same
// tab.
const authState = vi.hoisted(() => ({userId: 'user-a'}));

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {
    ...actual,
    useAuth: () =>
      ({
        session: {user: {id: authState.userId}},
        isLoading: false,
      }) as unknown as ReturnType<typeof actual.useAuth>,
  };
});

const freeEntitlement: Entitlement = {
  plan: 'free',
  status: null,
  aiUsed: 0,
  aiLimit: 25,
  periodEndsAt: null,
  paddleCustomerId: null,
  cancelAtPeriodEnd: false,
};

const plusEntitlement: Entitlement = {
  plan: 'plus',
  status: 'active',
  aiUsed: 3,
  aiLimit: 200,
  periodEndsAt: '2026-11-16T12:00:00.000Z',
  paddleCustomerId: 'ctm_a',
  cancelAtPeriodEnd: false,
};

describe('ProfileSubscriptionSection account switch during refresh', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('a refresh response is cached under the account that started it', async () => {
    authState.userId = 'user-a';
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      freeEntitlement,
    );
    let resolveRefresh!: (value: Entitlement) => void;
    vi.spyOn(eciperay.account, 'refreshEntitlement').mockImplementation(
      () =>
        new Promise<Entitlement>(resolve => {
          resolveRefresh = resolve;
        }),
    );
    // Production-like cache retention: the shared QueryClient keeps
    // an unobserved entry for minutes (React Query's default gcTime),
    // which is exactly why a misdirected cache write would survive
    // the account switch. The shared test client uses gcTime: 0,
    // which would collect user-a's entry before the assertion.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 60_000,
          staleTime: Infinity,
          refetchOnWindowFocus: false,
        },
      },
    });
    const view = await renderWithProviders(<ProfileSubscriptionSection />, {
      withAuth: false,
      queryClient,
    });
    expect(await screen.findByText('Free plan')).toBeInTheDocument();

    // user-a starts a "Check again" refresh; the POST stays pending.
    await userEvent.click(screen.getByRole('button', {name: 'Check again'}));

    // The session switches to user-b while the POST is in flight and
    // the component stays mounted; user-b's own entitlement loads.
    authState.userId = 'user-b';
    view.rerender(<ProfileSubscriptionSection />);
    expect(await screen.findByText('Free plan')).toBeInTheDocument();

    // The pending refresh now resolves with user-a's Plus
    // entitlement. It must land in user-a's cache entry only: cached
    // under user-b, it would display user-a's plan and Paddle
    // customer id on user-b's profile.
    await act(async () => {
      resolveRefresh(plusEntitlement);
    });
    expect(queryClient.getQueryData(queryKeys.entitlement('user-a'))).toEqual(
      plusEntitlement,
    );
    expect(queryClient.getQueryData(queryKeys.entitlement('user-b'))).toEqual(
      freeEntitlement,
    );
    expect(screen.queryByText('Plus plan')).not.toBeInTheDocument();
  });
});
