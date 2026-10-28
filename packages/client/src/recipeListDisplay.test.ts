import {DISCOVER_NO_RATINGS_LABEL} from './discoverCopy.js';
import {
  formatDiscoveryListMeta,
  formatDisplayRatingLabel,
  formatRecipeListMeta,
  formatRecipeListSubtitle,
  formatSatietyLabel,
  formatServingsLabel,
  getDisplayRating,
} from './recipeListDisplay.js';

describe('recipeListDisplay', () => {
  test('prefers personal star rating over community average', () => {
    expect(
      getDisplayRating({
        starRating: 5,
        communityRating: {average: 3, count: 10, hasStaleRatings: false},
      }),
    ).toBe(5);
    expect(
      getDisplayRating({
        starRating: null,
        communityRating: {average: 3.5, count: 2, hasStaleRatings: false},
      }),
    ).toBe(3.5);
    expect(getDisplayRating({starRating: null, communityRating: null})).toBe(
      null,
    );
  });

  test('formats satiety and list meta', () => {
    expect(formatSatietyLabel(72, 'ready')).toBe('Satiety 72');
    // #278: pending is spelled out — 'Satiety…' read as a truncated value.
    expect(formatSatietyLabel(null, 'pending')).toBe('Satiety pending');
    expect(formatSatietyLabel(null, null)).toBe('Satiety —');
    expect(formatDisplayRatingLabel({})).toBe(DISCOVER_NO_RATINGS_LABEL);
    expect(
      formatRecipeListMeta({
        starRating: 4,
        communityRating: null,
        satietyScore: 60,
        nutritionStatus: 'ready',
      }),
    ).toContain('Satiety 60');
    expect(
      formatDiscoveryListMeta({
        communityRating: {average: 4.2, count: 8, hasStaleRatings: false},
        satietyScore: null,
        nutritionStatus: null,
      }),
    ).toContain('4.2 (8)');
  });

  test('pluralizes servings and formats the card subtitle (#278)', () => {
    expect(formatServingsLabel(1)).toBe('1 serving');
    expect(formatServingsLabel(2)).toBe('2 servings');
    expect(
      formatRecipeListSubtitle({
        servings: 1,
        cookTimeMin: null,
        starRating: null,
        communityRating: null,
        satietyScore: null,
        nutritionStatus: null,
      }),
    ).toContain('1 serving ·');
    expect(
      formatRecipeListSubtitle({
        servings: 6,
        cookTimeMin: 40,
        starRating: null,
        communityRating: null,
        satietyScore: 60,
        nutritionStatus: 'ready',
      }),
    ).toContain('6 servings · 40 min ·');
  });
});
