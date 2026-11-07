import type {SubscriptionViewProps} from '@eciperay/client';
import type {Entitlement} from '@eciperay/types';
import {vi} from 'vitest';

import {buildSubscriptionData} from './subscriptionData.js';

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

const buildData = (props: Partial<SubscriptionViewProps>) =>
  buildSubscriptionData({
    entitlement: null,
    isLoading: false,
    isOpeningPortal: false,
    onManage: () => {},
    error: null,
    ...props,
  });

describe('buildSubscriptionData', () => {
  test('passes the loading state through', () => {
    expect(buildData({isLoading: true}).loading).toBe(true);
  });

  test('passes an error through', () => {
    expect(buildData({error: 'Could not load subscription'}).error).toBe(
      'Could not load subscription',
    );
  });

  test('free plan shows the upsell and no manage action', () => {
    const data = buildData({entitlement: makeEntitlement({})});
    expect(data.planLabel).toBe('Free plan');
    expect(data.statusText).toBeNull();
    expect(data.upsellText).toMatch(/Plus \(\$3\.99\/mo\)/);
    expect(data.onManage).toBeUndefined();
  });

  test('active paid plan shows the renewal date and manage action', () => {
    const onManage = vi.fn();
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        periodEndsAt: '2026-11-16T12:00:00.000Z',
        paddleCustomerId: 'ctm_123',
      }),
      onManage,
    });
    expect(data.planLabel).toBe('Plus plan');
    expect(data.statusText).toBe('Active — renews Nov 16, 2026');
    expect(data.upsellText).toBeNull();
    expect(data.onManage).toBe(onManage);
  });

  test('active plan scheduled to cancel shows access-until, not a renewal', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        cancelAtPeriodEnd: true,
        periodEndsAt: '2026-11-16T12:00:00.000Z',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(data.statusText).toBe('Cancelling — access until Nov 16, 2026');
  });

  test('active plan scheduled to cancel without a period end shows a plain cancelling status', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        cancelAtPeriodEnd: true,
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(data.statusText).toBe(
      'Cancelling — access until the end of the current period',
    );
  });

  test('free plan with a retained cancelled status shows the free summary, not cancelled messaging', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'free',
        status: 'cancelled',
        periodEndsAt: '2026-10-16T12:00:00.000Z',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(data.planLabel).toBe('Free plan');
    expect(data.statusText).toBeNull();
    expect(data.upsellText).toMatch(/Plus \(\$3\.99\/mo\)/);
    // The retained billing customer does not resurrect the manage
    // action's plan messaging, but the action itself still crosses
    // while a customer id exists.
    expect(data.onManage).toBeDefined();
  });

  test('free plan with a retained past_due status shows the free summary, not a payment warning', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'free',
        status: 'past_due',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(data.planLabel).toBe('Free plan');
    expect(data.statusText).toBeNull();
    expect(data.upsellText).toMatch(/Plus \(\$3\.99\/mo\)/);
  });

  test('shows the reconciling line while reconciling with an entitlement', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        paddleCustomerId: 'ctm_123',
      }),
      isReconciling: true,
    });
    expect(data.reconcilingText).toBe(
      'Checking for the latest subscription status…',
    );
  });

  test('omits the reconciling line without an entitlement', () => {
    expect(buildData({isReconciling: true}).reconcilingText).toBeNull();
  });

  test('passes the refresh action and its pending state through', () => {
    const onRefresh = vi.fn();
    const data = buildData({
      entitlement: makeEntitlement({}),
      onRefresh,
      isRefreshing: true,
    });
    expect(data.onRefresh).toBe(onRefresh);
    expect(data.refreshPending).toBe(true);
  });

  test('omits the refresh action without an entitlement', () => {
    const data = buildData({onRefresh: () => {}});
    expect(data.onRefresh).toBeUndefined();
  });

  test('passes the portal fallback URL through', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        paddleCustomerId: 'ctm_123',
      }),
      portalUrl: 'https://portal.example/session',
    });
    expect(data.portalUrl).toBe('https://portal.example/session');
  });

  test('active plan without a period end shows a plain Active status', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'power',
        status: 'active',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(data.planLabel).toBe('Power plan');
    expect(data.statusText).toBe('Active');
  });

  test('cancelled plan shows the access-until date', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'cancelled',
        periodEndsAt: '2026-11-16T12:00:00.000Z',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(data.statusText).toBe('Cancelled — access until Nov 16, 2026');
  });

  test('cancelled plan without a period end shows a plain Cancelled status', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'cancelled',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(data.statusText).toBe('Cancelled');
  });

  test('past due plan warns about the payment method', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'past_due',
        paddleCustomerId: 'ctm_123',
      }),
    });
    expect(data.statusText).toMatch(/Payment past due/);
  });

  test('expired plan shows Expired and no manage action without a customer', () => {
    const data = buildData({
      entitlement: makeEntitlement({plan: 'plus', status: 'expired'}),
    });
    expect(data.statusText).toBe('Expired');
    expect(data.onManage).toBeUndefined();
  });

  test('manage pending state reflects the portal opening', () => {
    const data = buildData({
      entitlement: makeEntitlement({
        plan: 'plus',
        status: 'active',
        paddleCustomerId: 'ctm_123',
      }),
      isOpeningPortal: true,
    });
    expect(data.managePending).toBe(true);
  });
});
