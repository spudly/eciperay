/**
 * The shared slug / canonical-URL helper for app recipe URLs (#419).
 *
 * The canonical app URL for a recipe is `/recipes/:id/:slug`. The ID is the
 * only lookup key; the slug is a canonical decoration derived from the recipe's
 * current title. One helper builds every app-internal recipe link (lists, meal
 * plans, search, share flows, native deep links) and decides the canonical
 * redirect on the detail page, so the forms can never drift.
 *
 * Slug source, in order:
 *
 * 1. The recipe record's stored `slug`, verbatim — the server owns it and it may
 *    carry a de-duplicated suffix the client must not strip or re-derive (see
 *    the stored-slug test in recipeVisibility.test).
 * 2. `slugifyRecipeTitle(title)` when only a title is known (meal and meal-plan
 *    members carry a title but no slug). If that title's slug differs from the
 *    stored slug, the detail page's canonicalization replaces it with the
 *    stored form on load.
 * 3. No slug at all when neither is known (a create/clone result carries only
 *    IDs): the bare `/recipes/:id` path, which the detail page canonicalizes to
 *    the slugged form once the recipe resolves.
 */

/**
 * Title → slug, with exactly the server's semantics
 * (packages/server/src/lib/slugifyRecipeTitle): lowercase, strip accents and
 * punctuation, collapse whitespace/hyphen runs, and fall back to `recipe` when
 * nothing slug-able remains.
 */
export const slugifyRecipeTitle = (title: string): string => {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');

  if (slug.length > 0) {
    return slug;
  }

  return 'recipe';
};

/** What a caller knows about a recipe when building its app URL. */
export type RecipeUrlSource = {
  id: string;
  slug?: string | null;
  title?: string | null;
};

/**
 * The canonical slug for a recipe, or null when neither a stored slug nor a
 * title is known (the bare-ID fallback in buildRecipePath).
 */
export const recipeSlugFor = (source: RecipeUrlSource): string | null => {
  const stored = source.slug?.trim();
  if (stored) {
    return stored;
  }
  if (source.title) {
    return slugifyRecipeTitle(source.title);
  }
  return null;
};

/**
 * The canonical app path for a recipe: `/recipes/:id/:slug`, or the bare
 * `/recipes/:id` when no slug can be derived (see the header).
 */
export const buildRecipePath = (source: RecipeUrlSource): string => {
  const slug = recipeSlugFor(source);
  const idSegment = encodeURIComponent(source.id);
  return slug
    ? `/recipes/${idSegment}/${encodeURIComponent(slug)}`
    : `/recipes/${idSegment}`;
};

/** The absolute canonical app URL for a recipe, from a site base URL. */
export const buildRecipeCanonicalUrl = (
  baseUrl: string,
  source: RecipeUrlSource,
): string => new URL(buildRecipePath(source), baseUrl).toString();
