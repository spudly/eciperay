import {useAuth} from '@eciperay/client';

import {AppShell} from '../components/AppShell.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';

import {HomePage} from './HomePage.js';
import {MarketingLandingPage} from './MarketingLandingPage.js';

export const HomeEntry = () => {
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

  if (session) {
    return (
      <AppShell>
        <HomePage />
      </AppShell>
    );
  }

  return <MarketingLandingPage />;
};
