import type {SubscriptionViewProps} from '@eciperay/client';
import type {Entitlement, PlanName} from '@eciperay/types';
import type {ProfilePageSubscription} from '@spudly/ui';

const PLAN_LABELS: Record<PlanName, string> = {
  free: 'Free',
  plus: 'Plus',
  power: 'Power',
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const statusText = (entitlement: Entitlement): string | null => {
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
          ? `Cancelling — access until ${formatDate(entitlement.periodEndsAt)}`
          : 'Cancelling — access until the end of the current period';
      }
      return entitlement.periodEndsAt
        ? `Active — renews ${formatDate(entitlement.periodEndsAt)}`
        : 'Active';
    }
    case 'cancelled': {
      return entitlement.periodEndsAt
        ? `Cancelled — access until ${formatDate(entitlement.periodEndsAt)}`
        : 'Cancelled';
    }
    case 'past_due': {
      return 'Payment past due — update your payment method to keep your plan.';
    }
    case 'expired': {
      return 'Expired';
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
}: SubscriptionViewProps): ProfilePageSubscription => {
  const status = entitlement ? statusText(entitlement) : null;
  return {
    planLabel: entitlement ? `${PLAN_LABELS[entitlement.plan]} plan` : null,
    statusText: status,
    upsellText:
      entitlement && !status
        ? 'Plus ($3.99/mo) adds meal planning and more AI help; Power ($8.99/mo) adds API access.'
        : null,
    reconcilingText:
      entitlement && isReconciling
        ? 'Checking for the latest subscription status…'
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
