import {useAuth} from '@eciperay/client';

import {DiscoverPage} from '../pages/DiscoverPage.js';
import {RecipesPage} from '../pages/RecipesPage.js';

import {AuthenticatedShell} from './AuthenticatedShell.js';
import {ScreenLoadingGate} from './ScreenLoadingGate.js';

// One browse page for both auth states (#622, Stephen's
// 2026-11-21 directive): /discover and /recipes are the SAME page,
// served at both URLs. A signed-in viewer gets the personalized
// unified browse (RecipesPage: own recipes with preferred placement
// plus the public discovery feed) rendered IN PLACE at /discover —
// inside the authenticated shell, exactly as /recipes renders it —
// and a signed-out viewer gets the public browse at the same URL.
// There is no redirect in this flow, client-side or otherwise: the
// server renders /discover with the public content for SEO (see
// packages/server/src/routes/ssr/serveDiscoverPage.ts) and the
// client takes over at the same URL, applying personalization once
// auth resolves.
export const DiscoverRoute = () => {
  const {session, isLoading} = useAuth();

  if (isLoading) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  if (session) {
    return (
      <AuthenticatedShell>
        <RecipesPage />
      </AuthenticatedShell>
    );
  }

  return <DiscoverPage />;
};
