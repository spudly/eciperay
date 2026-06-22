import {useAuth} from '@eciperay/client';

import {AppShell} from '../components/AppShell.js';

import {HomePage} from './HomePage.js';
import {MarketingLandingPage} from './MarketingLandingPage.js';

export const HomeEntry = () => {
  const {session, isLoading} = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (session) {
    return (
      <AppShell>
        <HomePage />
      </AppShell>
    );
  }

  return <MarketingLandingPage />;
};
