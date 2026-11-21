import {queryKeys} from '@eciperay/client';
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
  const {data: me, isLoading} = useQuery({
    queryKey: queryKeys.currentUser(),
    queryFn: () => eciperay.auth.me(),
  });

  if (isLoading) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
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
