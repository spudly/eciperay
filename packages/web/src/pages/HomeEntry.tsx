import {useAuth} from '@eciperay/client';

import {AppShell} from '../components/AppShell.js';
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
      <AppShell>
        <HomePage />
      </AppShell>
    );
  }

  // Signed-out visitors get the marketing landing inside the one
  // AppShell too (#620): the DS AppShellPage chrome (brand mark,
  // public nav, Sign in action, shared footer) replaces the retired
  // host PublicHeader — there is no host-owned header component.
  return (
    <AppShell>
      <MarketingLandingPage />
    </AppShell>
  );
};
