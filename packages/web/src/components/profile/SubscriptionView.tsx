import type {SubscriptionViewProps} from '@eciperay/client';
import type {Entitlement, PlanName} from '@eciperay/types';
import {Button, SectionCard, Text as DSText} from '@spudly/ui';

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

export const SubscriptionView = ({
  entitlement,
  isLoading,
  isOpeningPortal,
  onManage,
  error,
  portalUrl,
  isReconciling,
  onRefresh,
  isRefreshing,
}: SubscriptionViewProps) => {
  const status = entitlement ? statusText(entitlement) : null;
  return (
    <SectionCard
      title="Subscription"
      variant="elevated"
      marginBottom="$8"
    >
      {error ? <DSText variant="error">{error}</DSText> : null}
      {isLoading ? (
        <DSText variant="hint">Loading subscription…</DSText>
      ) : entitlement ? (
        <>
          <DSText variant="subheading">
            {PLAN_LABELS[entitlement.plan]} plan
          </DSText>
          {status ? (
            <DSText variant="hint">{status}</DSText>
          ) : (
            <DSText variant="hint">
              Plus ($3.99/mo) adds meal planning and more AI help; Power
              ($8.99/mo) adds API access.
            </DSText>
          )}
          {isReconciling ? (
            <DSText variant="hint">
              Checking for the latest subscription status…
            </DSText>
          ) : null}
          {entitlement.paddleCustomerId ? (
            <Button
              variant="primary"
              disabled={isOpeningPortal}
              onPress={onManage}
            >
              {isOpeningPortal ? 'Opening…' : 'Manage subscription'}
            </Button>
          ) : null}
          {onRefresh ? (
            <Button
              variant="secondary"
              disabled={isRefreshing}
              onPress={onRefresh}
            >
              {isRefreshing ? 'Checking…' : 'Check again'}
            </Button>
          ) : null}
          {portalUrl ? (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              Open subscription portal
            </a>
          ) : null}
        </>
      ) : null}
    </SectionCard>
  );
};
