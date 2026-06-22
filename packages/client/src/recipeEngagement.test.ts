import {
  formatCommunityRatingLabel,
  STALE_COMMENT_HINT,
  STALE_COMMUNITY_RATING_HINT,
  STALE_VIEWER_RATING_HINT,
} from './recipeEngagement.js';

describe('recipeEngagement', () => {
  test('formats community rating labels', () => {
    expect(formatCommunityRatingLabel(4.2, 8)).toBe('4.2 (8)');
  });

  test('exports stale hint copy', () => {
    expect(STALE_COMMUNITY_RATING_HINT).toMatch(/half weight/i);
    expect(STALE_VIEWER_RATING_HINT).toMatch(/earlier version/i);
    expect(STALE_COMMENT_HINT).toMatch(/earlier version/i);
  });
});
