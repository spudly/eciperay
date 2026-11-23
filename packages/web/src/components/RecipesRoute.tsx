import {useAuth} from '@eciperay/client';

import {RecipesPage} from '../pages/RecipesPage.js';

import {AppShell} from './AppShell.js';
import {ScreenLoadingGate} from './ScreenLoadingGate.js';

// The ONE unified browse route (#622, Stephen's decisions
// 2026-11-21 and 2026-11-23: /recipes survives and /discover is
// removed entirely — no route, no redirect; and the pages and
// shell underneath are unified too, not just the route). Every
// viewer gets the same host RecipesPage inside the same AppShell
// at the same URL: the page branches on auth (signed-in -> own +
// shared + discovery sections; signed-out -> public-only
// rendering), and the shell handles both signed-in and signed-out
// users. The server renders /recipes with the public content for
// SEO (see packages/server/src/routes/ssr/serveRecipesPage.ts) and
// the client takes over at the same URL, applying personalization
// once auth resolves.
export const RecipesRoute = () => {
  const {isLoading} = useAuth();

  if (isLoading) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  return (
    <AppShell>
      <RecipesPage />
    </AppShell>
  );
};
