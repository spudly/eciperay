import {queryKeys, useAuth} from '@eciperay/client';
import {RouteErrorPage} from '@spudly/ui';
import {useQuery} from '@tanstack/react-query';
import {Navigate, Outlet} from 'react-router-dom';

import {eciperay} from '../lib/api.js';

import {ScreenLoadingGate} from './ScreenLoadingGate.js';

/**
 * Route guard for admin-only pages (#621): a non-admin who navigates directly
 * to an admin route is redirected to /recipes, matching the treatment other
 * unauthorized routes get. The server is the source of truth — isAdmin comes
 * from GET /auth/me, never a client-side comparison.
 */
export const AdminGuard = () => {
  const {session} = useAuth();
  const {
    data: me,
    isLoading,
    isError,
  } = useQuery({
    // Account-scoped key (#650 review): a shared QueryClient outlives
    // an account switch, so an unscoped key could render the previous
    // account's isAdmin.
    queryKey: queryKeys.currentUser(session?.user?.id ?? 'anonymous'),
    queryFn: () => eciperay.auth.me(),
  });

  if (isLoading) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  // A failed /auth/me is not a non-admin verdict (#650 review): show an
  // explicit error instead of redirecting an admin away as if the
  // server had confirmed they are not an admin. The error surface is
  // the DS RouteErrorPage (Stephen, 2026-11-21: app code never styles
  // its own panels — DS #119); RouteErrorPage has no retry action yet,
  // so the way forward is its home link until the DS gap
  // (design-system #765) adds an action slot.
  if (isError) {
    return (
      <RouteErrorPage
        variant="error"
        title="Something went wrong"
        message="Something went wrong loading your profile."
      />
    );
  }

  if (!me?.isAdmin) {
    return (
      <Navigate
        to="/recipes"
        replace
      />
    );
  }

  return <Outlet />;
};
