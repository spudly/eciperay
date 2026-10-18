import {errorMessage, queryKeys, useAuth} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {eciperay} from '../../lib/api.js';

import {SubscriptionView} from './SubscriptionView.js';

// Bounded reconciliation after checkout or a portal return. The
// entitlement endpoint reads subscription state that Paddle webhooks
// update separately, so the first fetch after arriving on /profile
// (checkout completion redirects here) — or the single focus refetch
// after returning from the portal tab — can beat the webhook and cache
// the old plan/status. Nothing else would fetch again while the page
// stays open: the 30s staleTime is not a polling interval, and
// refetchOnWindowFocus only fires on another focus event. So for 30s
// after mount, and for 30s after each window focus, refetch on a
// backoff; after that window the section settles and fetches normally.
const RECONCILE_OFFSETS_MS = [3000, 8000, 15_000, 30_000];
const RECONCILE_WINDOW_MS = 30_000;

export const ProfileSubscriptionSection = () => {
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  // Mounting starts a cycle: arriving here from /pay's
  // checkout.completed redirect is a mount.
  const [reconcileCycleStartedAt, setReconcileCycleStartedAt] =
    useState<number>(() => Date.now());
  const [isReconciling, setIsReconciling] = useState(true);

  // Key the cache by the authenticated user: the QueryClient is shared for
  // the life of the tab, so an unscoped key would leak the previous
  // account's plan/status across an account switch. 'anonymous' is only a
  // placeholder until the session resolves — the key changes (and the
  // query refetches) as soon as the real user id arrives.
  const userId = session?.user.id ?? 'anonymous';
  const entitlementQuery = useQuery({
    queryKey: queryKeys.entitlement(userId),
    queryFn: () => eciperay.account.getEntitlement(),
    // Always refetch on focus, ignoring the app-wide 30s staleTime:
    // returning from the billing portal is the moment the plan/status
    // is most likely to have just changed, and a still-fresh cache
    // entry would otherwise keep showing the old plan/renewal text
    // until some unrelated refetch happened.
    refetchOnWindowFocus: 'always',
  });

  // Returning from the portal tab is a window focus on this tab:
  // restart the reconciliation cycle so a webhook that lands after
  // the immediate focus refetch is still picked up without the user
  // having to focus again or reload.
  useEffect(() => {
    const onFocus = () => {
      setReconcileCycleStartedAt(Date.now());
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    setIsReconciling(true);
    const entitlementKey = queryKeys.entitlement(userId);
    const timers = RECONCILE_OFFSETS_MS.map(offset =>
      setTimeout(() => {
        void queryClient.refetchQueries({queryKey: entitlementKey});
      }, offset),
    );
    const endTimer = setTimeout(() => {
      setIsReconciling(false);
    }, RECONCILE_WINDOW_MS);
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      clearTimeout(endTimer);
    };
  }, [reconcileCycleStartedAt, queryClient, userId]);

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
      isReconciling={isReconciling}
      error={
        portalError ??
        (entitlementQuery.error ? errorMessage(entitlementQuery.error) : null)
      }
    />
  );
};
