import {useAuth} from '@eciperay/client';
import {Navigate} from 'react-router-dom';

import {DiscoverPage} from '../pages/DiscoverPage.js';

import {ScreenLoadingGate} from './ScreenLoadingGate.js';

// One browse page for both auth states (#622 scope amendment,
// 2026-11-20): /discover and /recipes resolve to the same page.
// Signed-in viewers land on the unified Recipes browse — their own
// recipes with preferred placement plus the public discovery feed
// the page already embeds — while signed-out viewers keep the
// public-only Discover treatment at this URL (SEO head, public
// header, public recipes only).
export const DiscoverRoute = () => {
  const {session, isLoading} = useAuth();

  if (isLoading) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  if (session) {
    return (
      <Navigate
        to="/recipes"
        replace
      />
    );
  }

  return <DiscoverPage />;
};
