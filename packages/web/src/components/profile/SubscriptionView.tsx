import type {SubscriptionViewProps} from '@eciperay/client';
import type {Entitlement, PlanName} from '@eciperay/types';
import {Text as DSText} from '@spudly/ui';

import {ErrorText} from '../ui/ErrorText.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {SectionCard} from '../ui/SectionCard.js';

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
}: SubscriptionViewProps) => {
  const status = entitlement ? statusText(entitlement) : null;
  return (
    <SectionCard title="Subscription">
      {error ? <ErrorText>{error}</ErrorText> : null}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading subscription…</p>
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
          {entitlement.paddleCustomerId ? (
            <PrimaryButton
              label="Manage subscription"
              loading={isOpeningPortal}
              loadingLabel="Opening…"
              onPress={onManage}
            />
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
