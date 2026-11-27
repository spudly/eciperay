/* eslint-disable max-lines -- unified recipe host: both routes' fetch paths, viewer-mode derivation, and state mapping */
import {
  buildRecipePath,
  buildRecipePermalink,
  mergeVersionIntoRecipe,
  queryKeys,
  recipeSlugFor,
  recordRecipeView,
  useAuth,
} from '@eciperay/client';
import type {PublicRecipeDetail} from '@eciperay/types';
import {RecipeDetailPage as DsRecipeDetailPage} from '@spudly/ui';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {AppShell} from '../components/AppShell.js';
import {RecipePageHead} from '../components/RecipePageHead.js';
import {RouteErrorView} from '../components/RouteErrorView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';

import {RecipeDetailHost} from './RecipeDetailHost.js';
import {RecipeGuestHost} from './RecipeGuestHost.js';

/**
 * The ONE recipe page host (#649 tranche 2): both recipe routes — the
 * public permalink `/recipe/:id/:slug` and the app route
 * `/recipes/:recipeId[/:slug]` — render this component, and it renders
 * the design system's single RecipeDetailPage for every viewer. What
 * changes with auth and access is only the form and the actions:
 *
 * - Owner → the owner form (RecipeDetailHost: edit, versions, sharing,
 *   delete, tweak, history, nutrition).
 * - Signed-in non-owner (public recipe, or one shared with them —
 *   including a share grant or the `t` share token, which the
 *   authenticated fetch now carries so a signed-in viewer following a
 *   public link stays on the recipe with the signed-in treatment
 *   instead of bouncing through sign-in or 404ing) → the guest form's
 *   signed-in variant (RecipeGuestHost: save-a-copy, ratings, comments
 *   where access allows).
 * - Signed-out → the guest form's signed-out variant (read-only recipe,
 *   sign-in CTA, no actions), loaded through the public fetch.
 * - No access (a private recipe the viewer cannot access, or a missing
 *   recipe) → the DS page's notFound / unavailable treatment on the
 *   public route, keyed only off the fetch result (the server withholds
 *   private recipe data, so nothing leaks); on the app route the same
 *   fetch result renders the route's not-found view, as before.
 *
 * Canonical/SEO is unchanged: RecipePageHead and the canonical link
 * keep pointing at `/recipe/:id/:slug` (the sitemap does too), and both
 * routes serve this page with no redirects added — the only redirects
 * are the pre-existing slug-canonical ones, which keep each route
 * family's own URL shape.
 */
const UnifiedRecipePage = ({publicRoute}: {publicRoute: boolean}) => {
  const params = useParams();
  const recipeId = publicRoute ? (params['id'] ?? '') : (params['recipeId'] ?? '');
  const slug = params['slug'];
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const shareToken = searchParams.get('t') ?? undefined;
  const {session} = useAuth();
  const [servings, setServings] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    () => searchParams.get('versionId'),
  );
  const queryClient = useQueryClient();

  const invalidateRecentlyViewed = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.recipes('home-recently-viewed'),
    });
  }, [queryClient]);

  useEffect(() => {
    if (!recipeId || !session) {
      return;
    }
    void recordRecipeView(recipeViewHistoryStorage, recipeId).then(() => {
      invalidateRecentlyViewed();
    });
  }, [recipeId, session, invalidateRecentlyViewed]);

  // The public fetch: the signed-out viewer's only path, and the
  // public route's source of the canonical slug and the document
  // head's data for every viewer.
  const publicQuery = useQuery({
    queryKey: queryKeys.publicRecipe(recipeId, slug, shareToken),
    queryFn: () =>
      eciperay.recipes.getPublic(recipeId, {slug, shareToken}),
    enabled: publicRoute && recipeId.length > 0 && Boolean(slug),
    retry: false,
  });

  // The authenticated fetch (tranche 1 made it honor share grants and
  // share tokens server-side): a signed-in viewer's path on both
  // routes. Its result is what decides owner vs signed-in non-owner —
  // never a client-side guess.
  const authedQuery = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => eciperay.recipes.get(recipeId, {shareToken}),
    enabled: recipeId.length > 0 && Boolean(session),
  });

  const authedRecipe = authedQuery.data;
  const isOwner =
    session !== null &&
    session !== undefined &&
    authedRecipe !== undefined &&
    authedRecipe.userId === session.user.id;

  const activeVersionId = selectedVersionId ?? authedRecipe?.versionId ?? '';

  const {data: versions = []} = useQuery({
    queryKey: queryKeys.versions(recipeId),
    queryFn: () => eciperay.versions.list(recipeId),
    enabled: recipeId.length > 0 && isOwner,
  });

  const viewingAlternateVersion =
    authedRecipe !== undefined && activeVersionId !== authedRecipe.versionId;

  const {data: versionDetail} = useQuery({
    queryKey: queryKeys.version(recipeId, activeVersionId),
    queryFn: () => eciperay.versions.get(recipeId, activeVersionId),
    enabled: recipeId.length > 0 && viewingAlternateVersion,
  });

  const displayRecipe = useMemo(() => {
    if (!authedRecipe) {
      return null;
    }
    if (viewingAlternateVersion && versionDetail) {
      return mergeVersionIntoRecipe(authedRecipe, versionDetail);
    }
    return authedRecipe;
  }, [authedRecipe, viewingAlternateVersion, versionDetail]);

  useEffect(() => {
    setServings(null);
  }, [activeVersionId]);

  useEffect(() => {
    const versionId = searchParams.get('versionId');
    if (!versionId || !recipeId) {
      return;
    }
    setSelectedVersionId(versionId);
    const next = new URLSearchParams(searchParams);
    next.delete('versionId');
    setSearchParams(next, {replace: true});
  }, [recipeId, searchParams, setSearchParams]);

  // The public route renders every state inside the one AppShell
  // (#620); the app route's shell comes from the router layout.
  const wrapPublic = (content: ReactNode) =>
    publicRoute ? <AppShell>{content}</AppShell> : content;

  const dsState = (state: 'loading' | 'notFound' | 'unavailable') =>
    wrapPublic(<DsRecipeDetailPage state={state} />);

  // No recipe id (or, on the public route, no slug): nothing can load,
  // so it reads as not found rather than a disabled query's endless
  // pending state.
  if (!recipeId || (publicRoute && !slug)) {
    return publicRoute ? dsState('notFound') : <RouteErrorView isNotFound />;
  }

  if (publicRoute) {
    // Slug-canonical redirect (from the retired public host): the
    // public response names the canonical slug; a stale slug replaces
    // to it, preserving the share token and any other query params.
    if (publicQuery.data?.slugMismatch && publicQuery.data.canonicalSlug !== slug) {
      const nextParams = new URLSearchParams(searchParams);
      const query = nextParams.toString();
      return (
        <Navigate
          to={`/recipe/${recipeId}/${publicQuery.data.canonicalSlug}${query ? `?${query}` : ''}`}
          replace
        />
      );
    }
    // With an authenticated recipe in hand its stored slug is the
    // canonical one (the public query may still be in flight).
    if (authedRecipe && !publicQuery.data && slug !== recipeSlugFor(authedRecipe)) {
      const nextParams = new URLSearchParams(searchParams);
      const query = nextParams.toString();
      return (
        <Navigate
          to={`/recipe/${recipeId}/${recipeSlugFor(authedRecipe)}${query ? `?${query}` : ''}`}
          replace
        />
      );
    }
  } else if (authedRecipe && slug !== recipeSlugFor(authedRecipe)) {
    // Canonicalization (#419), as before on the app route: a bare-ID
    // URL or a wrong/stale slug replaces to the canonical slugged URL.
    return (
      <Navigate
        replace
        to={`${buildRecipePath(authedRecipe)}${location.search}`}
      />
    );
  }

  const headRecipe: PublicRecipeDetail | null = publicQuery.data
    ? publicQuery.data.recipe
    : authedRecipe
      ? (() => {
          const {userId: _userId, ...rest} = authedRecipe;
          return {...rest, authorDisplayName: null};
        })()
      : null;
  const head = publicRoute && headRecipe ? (
    <RecipePageHead
      recipe={headRecipe}
      canonicalUrl={buildRecipePermalink(window.location.origin, {
        id: headRecipe.id,
        slug: publicQuery.data?.canonicalSlug ?? recipeSlugFor(headRecipe),
      })}
      communityRating={
        publicQuery.data?.communityRating ?? authedRecipe?.communityRating ?? null
      }
    />
  ) : null;

  const withHead = (content: ReactNode) => (
    <>
      {head}
      {wrapPublic(content)}
    </>
  );

  // Loading: the fetch that will decide this viewer's treatment is
  // still in flight. A signed-in viewer's public data alone never
  // settles the treatment (they may be the owner), so the
  // authenticated fetch decides for them; a signed-out viewer settles
  // on the public fetch (the app route's AuthGuard has already
  // resolved auth before this page renders there).
  const decidingPending = session
    ? authedQuery.isPending
    : publicRoute
      ? publicQuery.isLoading
      : authedQuery.isPending && !authedRecipe;
  if (decidingPending) {
    return publicRoute ? (
      dsState('loading')
    ) : (
      <ScreenLoadingGate pending>{null}</ScreenLoadingGate>
    );
  }

  // Owner: the full owner form, with versions and every action.
  if (isOwner && authedRecipe && displayRecipe) {
    const currentServings = servings ?? displayRecipe.servings;
    return withHead(
      <RecipeDetailHost
        recipe={authedRecipe}
        displayRecipe={displayRecipe}
        versions={versions}
        selectedVersionId={activeVersionId}
        onSelectVersion={setSelectedVersionId}
        currentServings={currentServings}
        scaleFactor={currentServings / displayRecipe.servings}
        onServingsChange={setServings}
      />,
    );
  }

  // Signed-in non-owner with access (the authenticated fetch succeeded
  // for a recipe they do not own): the guest form's signed-in variant,
  // fed by the authenticated data.
  if (session && authedRecipe) {
    return withHead(
      <RecipeGuestHost
        key={authedRecipe.id}
        recipe={authedRecipe}
        communityRating={authedRecipe.communityRating}
        viewerRating={authedRecipe.viewerRating}
        viewerRatingIsStale={authedRecipe.viewerRatingIsStale}
        shareToken={shareToken}
        slug={slug}
        publicList={publicRoute}
      />,
    );
  }

  if (publicRoute) {
    // Signed-out (or a signed-in viewer the authenticated fetch could
    // not serve but the public fetch can): the guest form fed by the
    // public data, in the variant the viewer's auth state selects.
    if (publicQuery.data?.recipe) {
      const data = publicQuery.data;
      return withHead(
        <RecipeGuestHost
          key={data.recipe.id}
          recipe={data.recipe}
          communityRating={data.communityRating}
          viewerRating={data.viewerRating}
          viewerRatingIsStale={data.viewerRatingIsStale}
          shareToken={shareToken}
          slug={slug}
          publicList
        />,
      );
    }
    if (publicQuery.isLoading) {
      return dsState('loading');
    }
    // No-access / missing, keyed off the fetch result only: an access
    // denial renders the unavailable treatment; anything else (404, a
    // settled query with no data) renders not found.
    if (publicQuery.error) {
      const message =
        publicQuery.error instanceof Error
          ? publicQuery.error.message
          : 'Unknown error';
      return dsState(
        message.toLowerCase().includes('denied') ? 'unavailable' : 'notFound',
      );
    }
    return dsState('notFound');
  }

  // App route, signed-in, no recipe: the authenticated fetch's result
  // decides, exactly as the pre-unification page behaved. A 404 wins
  // over a cached recipe (a recipe deleted elsewhere must not keep
  // rendering from cache).
  const error = authedQuery.error;
  const isNotFoundError =
    error instanceof Error &&
    (error.message === 'Recipe not found' ||
      error.message.startsWith('API error 404'));
  if (isNotFoundError) {
    return <RouteErrorView isNotFound />;
  }
  if (!authedQuery.isPending && !authedRecipe) {
    return <RouteErrorView isNotFound={!error} />;
  }
  return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
};

/**
 * Route entry for both recipe routes: the public permalink route
 * (`/recipe/:id/:slug`, outside the app layout, so the unified page
 * supplies its own shell) and the app route
 * (`/recipes/:recipeId[/:slug]`, inside the layout's shell). Both
 * render the one unified host above.
 */
export const RecipeDetailPage = () => {
  const params = useParams();
  const publicRoute = params['id'] !== undefined;
  const routeId = publicRoute ? params['id'] : params['recipeId'];
  return (
    <UnifiedRecipePage
      key={`${publicRoute ? 'public' : 'app'}:${routeId ?? ''}`}
      publicRoute={publicRoute}
    />
  );
};
