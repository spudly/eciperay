import {useAuth} from '@eciperay/client';
import {Navigate, Outlet} from 'react-router-dom';

import {ScreenLoadingGate} from './ScreenLoadingGate.js';

export const AuthGuard = () => {
  const {session, isLoading} = useAuth();

  if (isLoading) {
    return (
      <ScreenLoadingGate
        pending
        backgroundClassName="min-h-screen"
      >
        {null}
      </ScreenLoadingGate>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
};
