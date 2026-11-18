import type {SubscriptionViewProps} from '@eciperay/client';
import type {I18n} from '@lingui/core';
import type {Entitlement, PlanName} from '@eciperay/types';
import type {ProfilePageSubscription} from '@spudly/ui';

const planLabels = (i18n: I18n): Record<PlanName, string> => ({
  free: i18n._({id: 'profile.planFree', message: 'Free'}),
  plus: i18n._({id: 'profile.planPlus', message: 'Plus'}),
  power: i18n._({id: 'profile.planPower', message: 'Power'}),
});

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const statusText = (i18n: I18n, entitlement: Entitlement): string | null => {
  // The stored subscription status is retained after resolveEntitlement
  // lazily downgrades the effective plan to Free (e.g. a cancelled
  // subscription past its period end, or a past_due subscription past its
  // grace period). Paid-status messaging no longer applies then, so the
  // summary is selected by the effective plan, not the retained status.
  if (entitlement.plan === 'free') {
    return null;
  }
  switch (entitlement.status) {
    case 'active': {
      if (entitlement.cancelAtPeriodEnd) {
        return entitlement.periodEndsAt
          ? i18n._({
              id: 'profile.statusCancellingUntil',
              message: 'Cancelling — access until {date}',
              values: {date: formatDate(entitlement.periodEndsAt)},
            })
          : i18n._({
              id: 'profile.statusCancelling',
              message: 'Cancelling — access until the end of the current period',
            });
      }
      return entitlement.periodEndsAt
        ? i18n._({
            id: 'profile.statusActiveRenews',
            message: 'Active — renews {date}',
            values: {date: formatDate(entitlement.periodEndsAt)},
          })
        : i18n._({id: 'profile.statusActive', message: 'Active'});
    }
    case 'cancelled': {
      return entitlement.periodEndsAt
        ? i18n._({
            id: 'profile.statusCancelledUntil',
            message: 'Cancelled — access until {date}',
            values: {date: formatDate(entitlement.periodEndsAt)},
          })
        : i18n._({id: 'profile.statusCancelled', message: 'Cancelled'});
    }
    case 'past_due': {
      return i18n._({
        id: 'profile.statusPastDue',
        message:
          'Payment past due — update your payment method to keep your plan.',
      });
    }
    case 'expired': {
      return i18n._({id: 'profile.statusExpired', message: 'Expired'});
    }
    default: {
      return null;
    }
  }
};

/**
 * Maps the host's subscription state to the ProfilePage's typed `subscription`
 * data prop (the design system's SubscriptionView contract): every display
 * string is composed here from the entitlement, and the manage action only
 * crosses while the entitlement carries a billing customer — the states the
 * former host SubscriptionView rendered conditionally.
 */
export const buildSubscriptionData = ({
  entitlement,
  isLoading,
  isOpeningPortal,
  onManage,
  error,
  portalUrl,
  isReconciling,
  onRefresh,
  isRefreshing,
}: SubscriptionViewProps, i18n: I18n): ProfilePageSubscription => {
  const status = entitlement ? statusText(i18n, entitlement) : null;
  return {
    planLabel: entitlement
      ? i18n._({
          id: 'profile.planLabel',
          message: '{plan} plan',
          values: {plan: planLabels(i18n)[entitlement.plan]},
        })
      : null,
    statusText: status,
    upsellText:
      entitlement && !status
        ? i18n._({
            id: 'profile.upsell',
            message:
              'Plus ($3.99/mo) adds meal planning and more AI help; Power ($8.99/mo) adds API access.',
          })
        : null,
    reconcilingText:
      entitlement && isReconciling
        ? i18n._({
            id: 'profile.reconciling',
            message: 'Checking for the latest subscription status…',
          })
        : null,
    error,
    loading: isLoading,
    ...(entitlement?.paddleCustomerId
      ? {onManage, managePending: isOpeningPortal}
      : {}),
    ...(entitlement && onRefresh
      ? {onRefresh, refreshPending: Boolean(isRefreshing)}
      : {}),
    portalUrl: portalUrl ?? null,
  };
};
