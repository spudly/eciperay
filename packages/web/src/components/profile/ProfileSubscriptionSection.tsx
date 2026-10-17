import {errorMessage, queryKeys, useAuth} from '@eciperay/client';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useState} from 'react';

import {eciperay} from '../../lib/api.js';

import {SubscriptionView} from './SubscriptionView.js';

export const ProfileSubscriptionSection = () => {
  const {session} = useAuth();
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  // Key the cache by the authenticated user: the QueryClient is shared for
  // the life of the tab, so an unscoped key would leak the previous
  // account's plan/status across an account switch. 'anonymous' is only a
  // placeholder until the session resolves — the key changes (and the
  // query refetches) as soon as the real user id arrives.
  const userId = session?.user.id ?? 'anonymous';
  const entitlementQuery = useQuery({
    queryKey: queryKeys.entitlement(userId),
    queryFn: () => eciperay.account.getEntitlement(),
  });

  const portalMutation = useMutation({
    mutationFn: () => eciperay.billing.createPortalLink(),
  });

  const handleManage = () => {
    setPortalError(null);
    setPortalUrl(null);
    // Open the tab synchronously, inside the click's user activation:
    // waiting for the portal-link request first lets the activation
    // expire, and the browser then blocks the tab as a popup.
    const portalWindow = window.open('', '_blank');
    // Drive the tab from the mutateAsync promise, not per-call mutate
    // callbacks: React Query only invokes those while the component is
    // still subscribed, so leaving /profile mid-request would skip them
    // and strand the pre-opened tab blank. The promise handlers close
    // over the local tab handle and run even after unmount; the
    // setState calls below are no-ops once unmounted, which is fine —
    // only the tab handling has to survive navigation.
    void portalMutation
      .mutateAsync()
      .then(({url}) => {
        if (portalWindow && !portalWindow.closed) {
          portalWindow.opener = null;
          portalWindow.location.href = url;
        } else {
          // The pre-opened tab was blocked or closed — fall back to a
          // clickable link so the click still has a visible result.
          setPortalUrl(url);
        }
      })
      .catch((mutationError: unknown) => {
        portalWindow?.close();
        setPortalError(errorMessage(mutationError));
      });
  };

  return (
    <SubscriptionView
      entitlement={entitlementQuery.data ?? null}
      isLoading={entitlementQuery.isLoading}
      isOpeningPortal={portalMutation.isPending}
      onManage={handleManage}
      portalUrl={portalUrl}
      error={
        portalError ??
        (entitlementQuery.error ? errorMessage(entitlementQuery.error) : null)
      }
    />
  );
};
