import {DISCOVER_NO_RATINGS_LABEL} from './discoverCopy.js';
import {
  formatCondensedNutritionParts,
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
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
      }),
    ).toContain('Satiety 60');
    expect(
      formatDiscoveryListMeta({
        communityRating: {average: 4.2, count: 8, hasStaleRatings: false},
        satietyScore: null,
        nutritionStatus: null,
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
      }),
    ).toContain('4.2 (8)');
  });

  test('condensed meta shows all five nutrition values (#361)', () => {
    expect(
      formatCondensedNutritionParts({
        calories: 400.4,
        proteinG: 20.2,
        carbsG: 40,
        fatG: 10,
      }),
    ).toEqual(['400 cal', '20g protein', '40g carbs', '10g fat']);
    // A value shows only when non-null.
    expect(
      formatCondensedNutritionParts({
        calories: null,
        proteinG: 20,
        carbsG: null,
        fatG: 10,
      }),
    ).toEqual(['20g protein', '10g fat']);
    expect(
      formatRecipeListMeta({
        starRating: 4,
        communityRating: null,
        satietyScore: 60,
        nutritionStatus: 'ready',
        calories: 400,
        proteinG: 20,
        carbsG: 40,
        fatG: 10,
      }),
    ).toBe('4.0★ · 400 cal · 20g protein · 40g carbs · 10g fat · Satiety 60');
    expect(
      formatDiscoveryListMeta({
        communityRating: {average: 4.2, count: 8, hasStaleRatings: false},
        satietyScore: 55,
        nutritionStatus: 'ready',
        calories: 300,
        proteinG: 15,
        carbsG: 30,
        fatG: 5,
      }),
    ).toBe('4.2 (8) · 300 cal · 15g protein · 30g carbs · 5g fat · Satiety 55');
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
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
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
        calories: 400,
        proteinG: 20,
        carbsG: 40,
        fatG: 10,
      }),
    ).toContain('6 servings · 40 min ·');
    expect(
      formatRecipeListSubtitle({
        servings: 6,
        cookTimeMin: 40,
        starRating: null,
        communityRating: null,
        satietyScore: 60,
        nutritionStatus: 'ready',
        calories: 400,
        proteinG: 20,
        carbsG: 40,
        fatG: 10,
      }),
    ).toContain('400 cal · 20g protein · 40g carbs · 10g fat · Satiety 60');
  });
});
