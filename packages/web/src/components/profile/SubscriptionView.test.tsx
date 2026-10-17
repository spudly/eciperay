import type {Entitlement} from '@eciperay/types';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {renderWithProviders} from '../../test/testUtils.js';

import {SubscriptionView} from './SubscriptionView.js';

const makeEntitlement = (overrides: Partial<Entitlement>): Entitlement => ({
  plan: 'free',
  status: null,
  aiUsed: 0,
  aiLimit: 25,
  periodEndsAt: null,
  paddleCustomerId: null,
  cancelAtPeriodEnd: false,
  ...overrides,
});

const renderView = async (
  props: Partial<Parameters<typeof SubscriptionView>[0]>,
) =>
  renderWithProviders(
    <SubscriptionView
      entitlement={null}
      isLoading={false}
      isOpeningPortal={false}
      onManage={() => {}}
      error={null}
      {...props}
    />,
    {withAuth: false},
  );

describe('SubscriptionView', () => {
  test('shows a loading message', async () => {
    await renderView({isLoading: true});
    expect(screen.getByText('Loading subscription…')).toBeInTheDocument();
  });

  test('shows an error', async () => {
    await renderView({error: 'Could not load subscription'});
    expect(screen.getByText('Could not load subscription')).toBeInTheDocument();
  });

  test('free plan shows the upsell and no manage button', async () => {
    await renderView({entitlement: makeEntitlement({})});
    expect(screen.getByText('Free plan')).toBeInTheDocument();
    expect(screen.getByText(/Plus \(\$3\.99\/mo\)/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Manage subscription'}),
    ).not.toBeInTheDocument();
  });

  test('active paid plan shows the renewal date and manage button', async () => {
    const onManage = vi.fn();
    await renderView({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        periodEndsAt: '2026-11-16T12:00:00.000Z',
        paddleCustomerId: 'ctm_123',
      }),
      onManage,
    });
    expect(screen.getByText('Plus plan')).toBeInTheDocument();
    expect(
      screen.getByText('Active — renews Nov 16, 2026'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', {name: 'Manage subscription'}),
    );
    expect(onManage).toHaveBeenCalledTimes(1);
  });

  test('active plan scheduled to cancel shows access-until, not a renewal', async () => {
    await renderView({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        cancelAtPeriodEnd: true,
        periodEndsAt: '2026-11-16T12:00:00.000Z',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(
      screen.getByText('Cancelling — access until Nov 16, 2026'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/renews/)).not.toBeInTheDocument();
  });

  test('active plan scheduled to cancel without a period end shows a plain cancelling status', async () => {
    await renderView({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        cancelAtPeriodEnd: true,
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(
      screen.getByText(
        'Cancelling — access until the end of the current period',
      ),
    ).toBeInTheDocument();
  });

  test('shows a checking message while reconciling', async () => {
    await renderView({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        paddleCustomerId: 'ctm_123',
      }),
      isReconciling: true,
    });
    expect(
      screen.getByText('Checking for the latest subscription status…'),
    ).toBeInTheDocument();
  });

  test('shows a clickable portal link when portalUrl is set', async () => {
    await renderView({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        paddleCustomerId: 'ctm_123',
      }),
      portalUrl: 'https://portal.example/session',
    });
    const link = screen.getByRole('link', {name: 'Open subscription portal'});
    expect(link).toHaveAttribute('href', 'https://portal.example/session');
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('active plan without a period end shows a plain Active status', async () => {
    await renderView({
      entitlement: makeEntitlement({
        plan: 'power',
        status: 'active',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(screen.getByText('Power plan')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('cancelled plan shows the access-until date', async () => {
    await renderView({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'cancelled',
        periodEndsAt: '2026-11-16T12:00:00.000Z',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(
      screen.getByText('Cancelled — access until Nov 16, 2026'),
    ).toBeInTheDocument();
  });

  test('cancelled plan without a period end shows a plain Cancelled status', async () => {
    await renderView({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'cancelled',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  test('past due plan warns about the payment method', async () => {
    await renderView({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'past_due',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(screen.getByText(/Payment past due/)).toBeInTheDocument();
  });

  test('expired plan shows Expired', async () => {
    await renderView({
      entitlement: makeEntitlement({plan: 'plus', status: 'expired'}),
    });
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Manage subscription'}),
    ).not.toBeInTheDocument();
  });

  test('manage button shows its opening state', async () => {
    await renderView({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        paddleCustomerId: 'ctm_123',
      }),
      isOpeningPortal: true,
    });
    expect(screen.getByRole('button', {name: 'Opening…'})).toBeInTheDocument();
  });
});
