// The Home page's title, subtitle, action labels, section title, and
// empty message — and the native Shared-with-me screen title — moved
// to the hosts' Lingui catalogs in #465 tranche 6 (`home.*` /
// `sharedWithMe.title` ids, resolved in the web HomePage and the
// native HomeScreen / navigator). What remains here is the non-copy
// recent-recipe count and the shared-with-me copy still consumed by
// the SharedWithMe views, which migrate in a later tranche.
export const HOME_RECENT_RECIPE_COUNT = 3;
// The shared-with-me empty state in its two sentences: hosts that
// render a single message use the composed constant; the DS
// RecipesPage's shared-with-me configuration takes the sentences
// separately as its emptyTitle / emptyBody (@spudly/ui 1.15.0).
export const SHARED_WITH_ME_EMPTY_TITLE =
  'Recipes others share with you will appear here.';
export const SHARED_WITH_ME_EMPTY_BODY =
  'Open a share link while signed in to save recipes to this list.';
export const SHARED_WITH_ME_EMPTY_MESSAGE = `${SHARED_WITH_ME_EMPTY_TITLE} ${SHARED_WITH_ME_EMPTY_BODY}`;
export const SAVE_RECIPE_COPY_LABEL = 'Save a copy';
