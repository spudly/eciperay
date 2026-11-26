/**
 * Recipe version tips (#635): the caps and normalization every save path
 * applies. A tip is a short authored note (≤280 chars); a version carries
 * at most 10, in display order. Empty/whitespace-only entries are dropped
 * and surviving entries are trimmed, so a stored list never contains
 * blanks. The caps themselves are enforced by the request schemas
 * (lib/schemas.ts) — an over-cap list is rejected, never silently cut.
 */
export const MAX_RECIPE_TIPS = 10;
export const MAX_RECIPE_TIP_LENGTH = 280;

export const normalizeRecipeTips = (
  tips: readonly string[] | null | undefined,
): string[] =>
  (tips ?? [])
    .map(tip => tip.trim())
    .filter(tip => tip.length > 0);
