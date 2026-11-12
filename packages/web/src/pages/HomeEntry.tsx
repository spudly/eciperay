import {useAuth} from '@eciperay/client';

import {AuthenticatedShell} from '../components/AuthenticatedShell.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';

import {HomePage} from './HomePage.js';
import {MarketingLandingPage} from './MarketingLandingPage.js';

export const HomeEntry = () => {
  const {session, isLoading} = useAuth();

  if (isLoading) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  if (session) {
    return (
      <AuthenticatedShell>
        <HomePage />
      </AuthenticatedShell>
    );
  }

  return <MarketingLandingPage />;
};
