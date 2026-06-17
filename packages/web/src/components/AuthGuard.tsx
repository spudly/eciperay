import {useAuth} from '@eciperay/client';
import {Navigate, Outlet} from 'react-router-dom';

export const AuthGuard = () => {
  const {session, isLoading} = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
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
