export const STALE_COMMUNITY_RATING_HINT =
  'Some community ratings were left on earlier recipe versions and count at half weight in the average.';

export const STALE_VIEWER_RATING_HINT =
  'Your rating was left on an earlier version of the recipe. Tap a star to update it for the current version.';

export const STALE_COMMENT_HINT =
  'This comment dates from an earlier version — the recipe may have evolved since.';

export const formatCommunityRatingLabel = (
  average: number,
  count: number,
): string => `${average.toFixed(1)} (${count})`;
