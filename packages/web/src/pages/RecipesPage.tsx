import {
  buildRecipePath,
  formatCondensedNutritionParts,
  formatDiscoveryListMeta,
  formatRecipeListSubtitle,
  formatSatietyLabel,
  formatServingsLabel,
  getDisplayRating,
  invalidateRecipeQueries,
  parseRecipeListFilterValues,
  useDebouncedValue,
  publicRecipeDiscoveryInfiniteQueryOptions,
  recipeListInfiniteQueryOptions,
  resizedImageUrl,
  sharedWithMeInfiniteQueryOptions,
  useAuth,
  useRecipeListFilters,
  type RecipeListFilterValues,
} from '@eciperay/client';
import type {
  CookLogInput,
  PublicRecipeDiscoveryItem,
  RecipeDetail,
  RecipeListSort,
  RecipeListSortDir,
} from '@eciperay/types';
import {useLingui} from '@lingui/react';
import {tokens} from '@spudly/ui';
import {
  RecipesPage as RecipesPageView,
  type RecipesPageDiscoveryItem,
  type RecipesPageItem,
} from '@spudly/ui';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {useCallback, useEffect, useRef, useState} from 'react';
import {
  useLocation,
  useNavigate,
  useNavigationType,
  useSearchParams,
} from 'react-router-dom';

import {RecipesPageHead} from '../components/RecipesPageHead.js';
import {StaticPageHead} from '../components/StaticPageHead.js';
import {eciperay} from '../lib/api.js';

/**
 * The subtitle for a RecipesPage row: servings · time · condensed nutrition
 * (calories · protein · carbs · fat, each only when known) · satiety, with no
 * rating segment — the page renders the rating itself as the row's stars (the
 * log-cook control), so keeping the text would show the rating twice. It
 * mirrors the app host's subtitle (the shared `formatRecipeListSubtitle` minus
 * its rating text) so both hosts present the same meta line on the same page
 * component.
 */
const formatRecipesPageSubtitle = (recipe: RecipeDetail) =>
  `${formatServingsLabel(recipe.servings)}${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${[
    ...formatCondensedNutritionParts(recipe),
    formatSatietyLabel(recipe.satietyScore, recipe.nutritionStatus),
  ].join(' · ')}`;

// The author byline is omitted entirely when the author has no
// display name (#498) — see the Discover host's formatAuthorName.
const formatDiscoveryAuthorName = (
  authorDisplayName: string | null,
): string | null => {
  const trimmed = authorDisplayName?.trim();
  return trimmed ? trimmed : null;
};

// One discovery-section row, composed exactly as the signed-out
// Discover host composes its rows (author byline, when there is one,
// plus the discovery meta line; the DS page only renders the string).
const toDiscoveryItem = (
  recipe: PublicRecipeDiscoveryItem,
  authorByline: (authorName: string) => string,
): RecipesPageDiscoveryItem => {
  const authorName = formatDiscoveryAuthorName(recipe.authorDisplayName);
  return {
    id: recipe.id,
    title: recipe.title,
    subtitle: `${authorName ? authorByline(authorName) : ''}${formatDiscoveryListMeta(recipe)}`,
    imageUrl: resizedImageUrl(recipe.imageUrl, 400),
    href: `/recipe/${recipe.id}/${recipe.slug}`,
  };
};

/**
 * The unified Recipes browse (#409, Stephen's approved plan): one page
 * combining the user's own material with preferred placement and the public
 * discovery catalog below it, under the page's one search / filter state. The
 * design system's RecipesPage renders the screen — own section, discovery
 * section, collapsed filter bar — and this host keeps everything the page must
 * not own: the three infinite queries, the filter state, navigation targets,
 * the item mappings, and the cook-log composition.
 *
 * The own section is the user's created recipes followed by the recipes shared
 * with them (each shared row carries the caller-supplied "Shared" badge and
 * keeps its public-permalink destination — the retired standalone
 * Shared-with-me screen's rows were link-only, and they stay that way here:
 * cook logs are owner-only on the server, so the host ignores log-cook presses
 * on shared rows even though the page renders the control for every own-section
 * row). The old flat props map as: created `recipes` → `ownRecipes` (with the
 * shared rows appended), `isLoading` → `loadingOwn`, `isFetchingNextPage` →
 * `isFetchingNextOwnPage`, and the host-rendered load-more error alert →
 * `ownLoadMoreErrorMessage` / `onOwnLoadMoreRetry`, which the page renders as
 * the own section's error row.
 *
 * Pagination: the page's end-reached signal (`onLoadMore`) is the discovery
 * section's continuation in the page's contract, and the own section paginates
 * separately on the host's own queries — so the host's handler continues every
 * query that has a next page, each gated on its own fetch state. A failed next
 * page latches that query's isFetchNextPageError, automatic loading for it
 * stops instead of cycling retries (the shared pagination pattern re-fires
 * onLoadMore when a fetch completes having added no rows, design-system#285,
 * and cannot tell an empty page from a failed one), and the own section's
 * load-more error row offers the manual retry.
 *
 * Header search (Stephen's decision: in scope with the unified browse): the
 * shell's search form navigates here with `?q=<term>`, and this host seeds the
 * page's one search state from that param whenever it changes.
 *
 * Filter persistence (#468): the current filter values are kept in this history
 * entry's location state (written with replace, never push), and a mount seeds
 * the filter state from any saved values it finds there — so opening a recipe
 * and pressing Back restores the filters exactly as left, while Back from the
 * browse itself still leaves in one step.
 */
const SignedInRecipesPage = () => {
  const {i18n} = useLingui();
  const location = useLocation();
  const navigate = useNavigate();
  // Filter persistence across back-navigation (#468, Stephen's spec):
  // the browse entry's location state carries the filter values, so
  // leaving for a recipe and pressing Back returns to this entry —
  // and this mount — with its state intact. Capture the saved values
  // once, at mount, and seed the filter state from them; later mounts
  // of this same entry (Back) re-read the then-current state.
  const [initialFilterValues] = useState(() =>
    parseRecipeListFilterValues(location.state),
  );
  const {filters, controls, values} = useRecipeListFilters({
    initialValues: initialFilterValues,
  });
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('q') ?? '';

  // Seed the page search from the header search's `q` param. The
  // latest onSearchChange, for the seeding effect below: the controls
  // object is rebuilt every render, so the effect cannot depend on
  // the callback itself without re-seeding on every render.
  const onSearchChangeRef = useRef(controls.onSearchChange);
  useEffect(() => {
    onSearchChangeRef.current = controls.onSearchChange;
  });
  // The latest controls, for the navigation effects below: the
  // controls object is rebuilt every render, so effects cannot
  // depend on its callbacks directly without re-firing every render.
  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  });
  // Seed on every navigation (location.key), not only when the term
  // changes: re-submitting the same header term after editing the
  // page search must re-apply it, and clearing the header search
  // (navigation to bare /recipes) must clear the page filter too —
  // the URL is the search state the two surfaces share. EXCEPT when
  // the current entry carries saved filter values in its location
  // state (#468): that entry is this page's own state-managed entry
  // (a filter-sync replace, or a Back return to it), and its saved
  // values — search included — are newer than the URL's `q`.
  useEffect(() => {
    if (parseRecipeListFilterValues(location.state)) {
      return;
    }
    // A stateless entry is a fresh arrival (menu, header, direct
    // link): it starts from default filters, with the search seeded
    // from `q` (#468, CodeRabbit round 2 — clearing only the search
    // here left the other filters from the previous entry applied
    // when the arrival did not remount the page). Entries carrying
    // saved filters are handled above and by the POP restore below.
    const c = controlsRef.current;
    c.onSearchChange(headerSearch);
    c.onIngredientChange('');
    c.onMinCaloriesChange('');
    c.onMaxCaloriesChange('');
    c.onMinSatietyChange('');
    c.onMaxSatietyChange('');
    c.onSortChange('newest');
    c.onSortDirChange('desc');
  }, [headerSearch, location.key, location.state]);

  // Restore on POP navigations between two browse entries (#468,
  // CodeRabbit round 1): React Router does NOT remount this page when
  // Back/Forward moves between two `/recipes` entries, so the mount
  // seeding above never re-runs and the entry's saved values would be
  // ignored. On a POP, re-apply the now-active entry's saved values
  // whenever they differ from the live fields. PUSH/REPLACE
  // navigations are excluded: a header-search PUSH seeds from `q`
  // (above), and this page's own sync writes are REPLACEs whose saved
  // values already equal the live ones.
  const navigationType = useNavigationType();
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  });
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  });
  // While a POP restore is in flight (saved values applied, field
  // state not yet caught up), the sync write below must not overwrite
  // the active entry's saved state with the stale live values.
  const pendingRestoreRef = useRef<{key: string; serialized: string} | null>(
    null,
  );
  useEffect(() => {
    if (navigationType !== 'POP') {
      return;
    }
    const saved = parseRecipeListFilterValues(location.state);
    if (!saved) {
      return;
    }
    const restored: RecipeListFilterValues = {
      search: '',
      ingredient: '',
      minCalories: '',
      maxCalories: '',
      minSatiety: '',
      maxSatiety: '',
      sort: 'newest',
      sortDir: 'desc',
      ...saved,
    };
    const serialized = JSON.stringify(restored);
    if (serialized === JSON.stringify(valuesRef.current)) {
      if (pendingRestoreRef.current?.key === location.key) {
        pendingRestoreRef.current = null;
      }
      return;
    }
    pendingRestoreRef.current = {key: location.key, serialized};
    const c = controlsRef.current;
    c.onSearchChange(restored.search);
    c.onIngredientChange(restored.ingredient);
    c.onMinCaloriesChange(restored.minCalories);
    c.onMaxCaloriesChange(restored.maxCalories);
    c.onMinSatietyChange(restored.minSatiety);
    c.onMaxSatietyChange(restored.maxSatiety);
    c.onSortChange(restored.sort);
    c.onSortDirChange(restored.sortDir);
  }, [location.key, location.state, navigationType]);

  // Once the live values catch up with a POP restore, the restore
  // is complete: clear the pending marker so later edits on this
  // entry sync normally again (#468, CodeRabbit round 3 — without
  // this, the write guard below kept blocking the sync for this
  // entry and a post-restore edit was lost on the next Back).
  useEffect(() => {
    const pending = pendingRestoreRef.current;
    if (pending && pending.serialized === JSON.stringify(values)) {
      pendingRestoreRef.current = null;
    }
  }, [values]);

  // Keep this history entry's location state holding the current
  // filter values (#468), so Back from a recipe restores them. The
  // write REPLACES the current entry (Stephen, 2026-11-09): filter
  // tweaks must never become Back stops of their own.
  const syncedFiltersRef = useRef<string | null>(null);
  const writeFilterState = useCallback(
    (currentValues: RecipeListFilterValues) => {
      const serialized = JSON.stringify(currentValues);
      if (syncedFiltersRef.current === serialized) {
        return;
      }
      const pending = pendingRestoreRef.current;
      if (
        pending &&
        pending.key === locationRef.current.key &&
        pending.serialized !== serialized
      ) {
        // A POP restore for this entry is still catching up; its
        // saved state is newer than these live values.
        return;
      }
      const saved = parseRecipeListFilterValues(locationRef.current.state);
      if (
        saved &&
        JSON.stringify({...currentValues, ...saved}) === serialized
      ) {
        // The entry already carries exactly these values (the mount
        // this page was seeded from, or our own previous write).
        syncedFiltersRef.current = serialized;
        return;
      }
      syncedFiltersRef.current = serialized;
      void navigate(
        {
          pathname: locationRef.current.pathname,
          search: locationRef.current.search,
        },
        {replace: true, state: {recipeListFilters: currentValues}},
      );
    },
    [navigate],
  );

  // The sync write is debounced (#468, CodeRabbit round 1): browsers
  // rate-limit history.replaceState (Safari throws a SecurityError
  // after ~100 calls in 30 seconds), so a burst of keystrokes must
  // settle into ONE write for the settled values, not one per
  // keystroke. The capture-phase link-click flush below covers the
  // remaining race — leaving via a link before the debounce settles —
  // by writing the latest values synchronously before the router's
  // own click handling pushes the new entry.
  const debouncedFilterValues = useDebouncedValue(values);
  useEffect(() => {
    writeFilterState(debouncedFilterValues);
  }, [debouncedFilterValues, writeFilterState]);
  useEffect(() => {
    const flushOnLinkClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest?.('a[href]')) {
        return;
      }
      writeFilterState(valuesRef.current);
    };
    // The shell's header search leaves via a form submit, not a
    // link: flush on any document submit (capture phase, before the
    // submit handler navigates) so a header search submitted before
    // the debounce settles still records the latest edits on the
    // entry being left (#468, CodeRabbit round 3).
    const flushOnSubmit = () => {
      writeFilterState(valuesRef.current);
    };
    document.addEventListener('click', flushOnLinkClick, true);
    document.addEventListener('submit', flushOnSubmit, true);
    return () => {
      document.removeEventListener('click', flushOnLinkClick, true);
      document.removeEventListener('submit', flushOnSubmit, true);
    };
  }, [writeFilterState]);

  const ownQuery = useInfiniteQuery(
    recipeListInfiniteQueryOptions(
      params => eciperay.recipes.list(params),
      filters,
    ),
  );
  const sharedQuery = useInfiniteQuery(
    sharedWithMeInfiniteQueryOptions(
      params => eciperay.recipes.listSharedWithMe(params),
      filters,
    ),
  );
  const discoveryQuery = useInfiniteQuery(
    publicRecipeDiscoveryInfiniteQueryOptions(
      params => eciperay.recipes.listPublic(params),
      filters,
    ),
  );

  const ownRecipes = ownQuery.data?.pages.flat() ?? [];
  const sharedRecipes = sharedQuery.data?.pages.flat() ?? [];
  const discoveryRecipes = discoveryQuery.data?.pages.flat() ?? [];

  // A failed FIRST page is not a load-more failure and not an empty
  // list: with no rows loaded the page would otherwise render its
  // empty state for what is actually an error. It crosses as the own
  // section's first-load error (`ownErrorMessage`); once any rows are
  // loaded, a failure is the load-more path below instead. The two
  // own-section queries fail independently — either one's failure
  // surfaces, and neither hides the discovery section.
  const ownSectionFailed = ownQuery.isError || sharedQuery.isError;
  const ownRowCount = ownRecipes.length + sharedRecipes.length;
  const ownErrorMessage =
    ownSectionFailed && ownRowCount === 0
      ? i18n._({
          id: 'recipes.loadError',
          message: "Couldn't load your recipes.",
        })
      : null;
  const ownLoadMoreErrorMessage =
    ownQuery.isFetchNextPageError ||
    sharedQuery.isFetchNextPageError ||
    (ownSectionFailed && ownRowCount > 0)
      ? i18n._({
          id: 'recipes.loadMoreError',
          message: "Couldn't load more recipes.",
        })
      : null;

  const handleOwnLoadMoreRetry = useCallback(() => {
    if (ownQuery.isFetchNextPageError) {
      void ownQuery.fetchNextPage();
    } else if (ownQuery.isError) {
      void ownQuery.refetch();
    }
    if (sharedQuery.isFetchNextPageError) {
      void sharedQuery.fetchNextPage();
    } else if (sharedQuery.isError) {
      void sharedQuery.refetch();
    }
  }, [ownQuery, sharedQuery]);

  const handleLoadMore = useCallback(() => {
    if (
      ownQuery.hasNextPage &&
      !ownQuery.isFetchingNextPage &&
      !ownQuery.isFetchNextPageError
    ) {
      void ownQuery.fetchNextPage();
    }
    if (
      sharedQuery.hasNextPage &&
      !sharedQuery.isFetchingNextPage &&
      !sharedQuery.isFetchNextPageError
    ) {
      void sharedQuery.fetchNextPage();
    }
    if (
      discoveryQuery.hasNextPage &&
      !discoveryQuery.isFetchingNextPage &&
      !discoveryQuery.isFetchNextPageError
    ) {
      void discoveryQuery.fetchNextPage();
    }
  }, [ownQuery, sharedQuery, discoveryQuery]);

  // The cook-log form's open state: DS 14's RecipesPage renders ONE
  // expanded form from the `cookLogForm` data prop (#687), so a single
  // open recipe id replaces the old per-row accessory set — opening a
  // second row's form closes the first. Shared rows are link-only
  // (cook logs are owner-only); the page renders the log-cook control
  // for every own-section row, so presses on shared rows are ignored.
  const [openCookLogId, setOpenCookLogId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const ownRecipesById = new Map(ownRecipes.map(recipe => [recipe.id, recipe]));

  const openCookLog = (recipeId: string) => {
    if (!ownRecipesById.has(recipeId)) {
      return;
    }
    openFormSessionRef.current += 1;
    setOpenCookLogId(recipeId);
  };

  const closeCookLog = () => {
    setOpenCookLogId(null);
  };

  const openCookLogRecipe = openCookLogId
    ? ownRecipesById.get(openCookLogId)
    : undefined;

  // A form-session token: each opening of the form mints one, and a
  // save carries the token of the form that submitted it. A save
  // completing after its form was replaced (the row left and
  // returned, a fresh form opened) must not close the replacement —
  // the mounted-lifetime guard the old per-row form component had,
  // re-expressed for the lifted state (invalidation always runs).
  const openFormSessionRef = useRef(0);
  const createCookLogMutation = useMutation({
    mutationFn: ({
      input,
      recipe,
    }: {
      input: CookLogInput;
      recipe: RecipeDetail;
      session: number;
    }) => eciperay.cookLogs.create(recipe.id, recipe.versionId, input),
    onSuccess: async (_data, variables) => {
      await invalidateRecipeQueries(
        queryClient,
        variables.recipe.id,
        variables.recipe.versionId,
      );
      if (openFormSessionRef.current === variables.session) {
        closeCookLog();
      }
    },
  });

  // Reconcile the open form with the rows actually in the list: when
  // its recipe leaves the list (filtered out, or the loading-to-empty
  // transition), the form closes, so a recipe that later returns
  // comes back closed.
  useEffect(() => {
    if (
      openCookLogId !== null &&
      !ownRecipes.some(recipe => recipe.id === openCookLogId)
    ) {
      setOpenCookLogId(null);
    }
  }, [ownRecipes, openCookLogId]);

  const ownItems: RecipesPageItem[] = ownRecipes.map(recipe => ({
    id: recipe.id,
    href: buildRecipePath(recipe),
    title: recipe.title,
    subtitle: formatRecipesPageSubtitle(recipe),
    rating: getDisplayRating(recipe),
    imageUrl: resizedImageUrl(recipe.imageUrl, 400),
  }));

  // Shared-with-me rows, in the shared query's order after the user's
  // own recipes: same subtitle composition the retired shared screen
  // used (its rating stays in the text — these rows have no log-cook
  // rating control), with the shared badge and the public permalink
  // the old card's link pointed at.
  const sharedItems: RecipesPageItem[] = sharedRecipes.map(recipe => ({
    id: recipe.id,
    href: `/recipe/${recipe.id}/${recipe.slug}`,
    title: recipe.title,
    subtitle: formatRecipeListSubtitle(recipe),
    imageUrl: resizedImageUrl(recipe.imageUrl, 400),
    // Family-shared rows (#617) carry the "Family" badge so the
    // recipient can tell them from individually shared recipes; the
    // server marks them `sharedVia: 'family'` (an individual grant
    // wins the marker when both exist).
    badgeLabel: recipe.sharedVia === 'family' ? 'Family' : 'Shared',
  }));

  return (
    <>
      <h1
        style={{
          margin: 0,
          marginBottom: tokens.spacing[4],
          fontSize: tokens.typography.fontSize['3xl'],
          fontWeight: tokens.typography.fontWeight.bold,
          fontFamily: tokens.typography.fontFamily.sans,
        }}
      >
        Recipes
      </h1>
      <RecipesPageView
        ownTitle={i18n._({id: 'recipes.ownTitle', message: 'Your recipes'})}
        ownRecipes={[...ownItems, ...sharedItems]}
        loadingOwn={ownQuery.isLoading || sharedQuery.isLoading}
        ownErrorMessage={ownErrorMessage}
        isFetchingNextOwnPage={
          ownQuery.isFetchingNextPage || sharedQuery.isFetchingNextPage
        }
        ownLoadMoreErrorMessage={ownLoadMoreErrorMessage}
        onOwnLoadMoreRetry={handleOwnLoadMoreRetry}
        discoveryTitle="Discover"
        discoveryRecipes={discoveryRecipes.map(recipe =>
          toDiscoveryItem(recipe, authorName =>
            i18n._({
              id: 'recipes.authorByline',
              message: 'By {authorName} · ',
              values: {authorName},
            }),
          ),
        )}
        loadingDiscovery={discoveryQuery.isLoading}
        discoveryEmptyTitle={
          controls.search.trim()
            ? i18n._({
                id: 'discover.emptySearchTitle',
                message: 'No public recipes match your search.',
              })
            : controls.ingredient.trim() ||
                controls.minCalories.trim() ||
                controls.maxCalories.trim() ||
                controls.minSatiety.trim() ||
                controls.maxSatiety.trim()
              ? i18n._({
                  id: 'discover.emptyFilterTitle',
                  message: 'No public recipes match those filters.',
                })
              : i18n._({
                  id: 'discover.emptyFeedMessage',
                  message:
                    'No public recipes yet — new dishes show up here as cooks share them.',
                })
        }
        discoveryErrorMessage={
          discoveryQuery.isError && discoveryRecipes.length === 0
            ? i18n._({
                id: 'discover.errorMessage',
                message:
                  "We couldn't load public recipes. Check your connection and try again.",
              })
            : null
        }
        isFetchingNextPage={discoveryQuery.isFetchingNextPage}
        onLogCookPress={openCookLog}
        cookLogForm={
          openCookLogRecipe
            ? {
                recipeId: openCookLogRecipe.id,
                title: i18n._({
                  id: 'recipeDetail.cookLogHeading',
                  message: 'How did it go?',
                }),
                notesPlaceholder: i18n._({
                  id: 'cookingMode.cookLogNotesPlaceholder',
                  message:
                    'Notes from this cook — what worked, what to change next time (optional)',
                }),
                secondaryLabel: i18n._({
                  id: 'recipeDetail.cookLogSkipLabel',
                  message: 'Skip',
                }),
                isPending: createCookLogMutation.isPending,
                onSkip: () => {
                  if (!createCookLogMutation.isPending) {
                    closeCookLog();
                  }
                },
                onSubmit: values => {
                  createCookLogMutation.mutate({
                    input: {
                      authorStarRating: values.rating,
                      notes: values.notes,
                    },
                    recipe: openCookLogRecipe,
                    session: openFormSessionRef.current,
                  });
                },
              }
            : null
        }
        onLoadMore={handleLoadMore}
        search={controls.search}
        onSearchChange={controls.onSearchChange}
        ingredient={controls.ingredient}
        onIngredientChange={controls.onIngredientChange}
        minCalories={controls.minCalories}
        onMinCaloriesChange={controls.onMinCaloriesChange}
        maxCalories={controls.maxCalories}
        onMaxCaloriesChange={controls.onMaxCaloriesChange}
        minSatiety={controls.minSatiety}
        onMinSatietyChange={controls.onMinSatietyChange}
        maxSatiety={controls.maxSatiety}
        onMaxSatietyChange={controls.onMaxSatietyChange}
        sort={controls.sort}
        onSortChange={value => {
          controls.onSortChange(value as RecipeListSort);
        }}
        sortDir={controls.sortDir}
        onSortDirChange={value => {
          controls.onSortDirChange(value as RecipeListSortDir);
        }}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// The signed-out (public) rendering of this same page (#622): the
// public-feed logic that used to live in the deleted host Discover
// page folds in here. It drives the DS RecipesPage's public variant
// directly (no DS Discover wrapper), with the public infinite query,
// the author-byline item mapping, and the discover copy. It renders
// inside the one AppShell (see RecipesRoute) — no PublicHeader, no
// page-level footer: the shell supplies both the header and the
// shared footer. Its head is the public one: StaticPageHead plus
// the ItemList JSON-LD head.
const formatPublicAuthorName = (
  authorDisplayName: string | null,
): string | null => {
  const trimmed = authorDisplayName?.trim();
  return trimmed ? trimmed : null;
};

const toPublicItem = (
  recipe: PublicRecipeDiscoveryItem,
  noRatingsLabel: string,
) => {
  const authorName = formatPublicAuthorName(recipe.authorDisplayName);
  return {
    id: recipe.id,
    title: recipe.title,
    subtitle: `${authorName ? `By ${authorName} \u00b7 ` : ''}${formatDiscoveryListMeta(recipe, noRatingsLabel)}`,
    imageUrl: resizedImageUrl(recipe.imageUrl, 400),
    href: `/recipe/${recipe.id}/${recipe.slug}`,
  };
};

const PublicRecipesPage = () => {
  const {i18n} = useLingui();
  const {filters, controls} = useRecipeListFilters({
    defaultSort: 'newest',
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery(
    publicRecipeDiscoveryInfiniteQueryOptions(
      params => eciperay.recipes.listPublic(params),
      filters,
    ),
  );

  const recipes = data?.pages.flat() ?? [];

  return (
    <>
      <StaticPageHead path="/recipes" />
      <RecipesPageHead recipes={recipes} />
      <RecipesPageView
        variant="public"
        title={i18n._({id: 'discover.title', message: 'Discover recipes'})}
        searchPlaceholder={i18n._({
          id: 'discover.searchPlaceholder',
          message: 'Search public recipes\u2026',
        })}
        emptyMessage={
          controls.search.trim()
            ? i18n._({
                id: 'discover.emptyMessage',
                message:
                  'No public recipes match that search \u2014 try a broader craving.',
              })
            : controls.ingredient.trim() ||
                controls.minCalories.trim() ||
                controls.maxCalories.trim() ||
                controls.minSatiety.trim() ||
                controls.maxSatiety.trim()
              ? i18n._({
                  id: 'discover.emptyFilterMessage',
                  message:
                    'No public recipes match those filters \u2014 try broadening them.',
                })
              : i18n._({
                  id: 'discover.emptyFeedMessage',
                  message:
                    'No public recipes yet \u2014 new dishes show up here as cooks share them.',
                })
        }
        errorMessage={
          error
            ? i18n._({
                id: 'discover.errorMessage',
                message:
                  "We couldn't load public recipes. Check your connection and try again.",
              })
            : null
        }
        recipes={recipes.map(recipe =>
          toPublicItem(
            recipe,
            i18n._({id: 'discover.noRatingsLabel', message: 'No ratings yet'}),
          ),
        )}
        loading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => {
          if (hasNextPage) {
            void fetchNextPage();
          }
        }}
        search={controls.search}
        onSearchChange={controls.onSearchChange}
        ingredient={controls.ingredient}
        onIngredientChange={controls.onIngredientChange}
        minCalories={controls.minCalories}
        onMinCaloriesChange={controls.onMinCaloriesChange}
        maxCalories={controls.maxCalories}
        onMaxCaloriesChange={controls.onMaxCaloriesChange}
        minSatiety={controls.minSatiety}
        onMinSatietyChange={controls.onMinSatietyChange}
        maxSatiety={controls.maxSatiety}
        onMaxSatietyChange={controls.onMaxSatietyChange}
        sort={controls.sort}
        onSortChange={value => {
          controls.onSortChange(value as RecipeListSort);
        }}
        sortDir={controls.sortDir}
        onSortDirChange={value => {
          controls.onSortDirChange(value as RecipeListSortDir);
        }}
      />
    </>
  );
};

/**
 * The ONE Recipes browse page (#622, Stephen's 2026-11-23 rework): a single
 * host page that branches on auth. Signed-in viewers get the unified browse
 * (own + shared + discovery sections); signed-out viewers get the public-only
 * rendering of the same page. Both render inside the one AppShell (see
 * RecipesRoute).
 */
export const RecipesPage = () => {
  const {session} = useAuth();
  return session ? <SignedInRecipesPage /> : <PublicRecipesPage />;
};
