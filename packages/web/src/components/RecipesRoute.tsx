import {useAuth} from '@eciperay/client';

import {DiscoverPage} from '../pages/DiscoverPage.js';
import {RecipesPage} from '../pages/RecipesPage.js';

import {AuthenticatedShell} from './AuthenticatedShell.js';
import {ScreenLoadingGate} from './ScreenLoadingGate.js';

// The ONE unified browse page (#622, Stephen's 2026-11-21 decision:
// /recipes survives and /discover is removed entirely — no route, no
// redirect). A signed-in viewer gets the personalized unified browse
// (RecipesPage: own recipes with preferred placement plus the public
// discovery feed) inside the authenticated shell, and a signed-out
// viewer gets the public browse (DiscoverPage) at the same URL. The
// server renders /recipes with the public content for SEO (see
// packages/server/src/routes/ssr/serveDiscoverPage.ts) and the client
// takes over at the same URL, applying personalization once auth
// resolves.
export const RecipesRoute = () => {
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
