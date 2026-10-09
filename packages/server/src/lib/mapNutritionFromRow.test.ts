import {
  mapCommunityRatingFromRow,
  mapNutritionInfoFromDetailRow,
  mapNutritionSummary,
} from './mapNutritionFromRow.js';

const readyColumns = {
  servings: 4,
  calories: 400,
  protein_g: 20,
  carbs_g: 40,
  fat_g: 10,
  fiber_g: 5,
  sugar_g: 3,
  sodium_mg: 200,
  prepared_weight_g: 800,
  satiety_score: 70,
  nutrition_status: 'ready' as const,
  nutrition_disclaimer: 'Estimates only',
  nutrition_updated_at: '2024-01-01T00:00:00.000Z',
};

describe('mapNutritionSummary', () => {
  test('maps summary fields including nulls', () => {
    expect(
      mapNutritionSummary({
        calories: 100,
        protein_g: 10,
        satiety_score: 50,
        nutrition_status: 'pending',
      }),
    ).toEqual({
      satietyScore: 50,
      nutritionStatus: 'pending',
      calories: 100,
      proteinG: 10,
    });
    expect(
      mapNutritionSummary({
        calories: null,
        protein_g: null,
        satiety_score: null,
        nutrition_status: null,
      }),
    ).toEqual({
      satietyScore: null,
      nutritionStatus: null,
      calories: null,
      proteinG: null,
    });
  });
});

describe('mapNutritionInfoFromDetailRow', () => {
  test('returns NutritionInfo when ready and null otherwise', () => {
    expect(mapNutritionInfoFromDetailRow(readyColumns)).toMatchObject({
      calories: 400,
      satietyScore: 70,
      status: 'ready',
      disclaimer: 'Estimates only',
    });
    expect(
      mapNutritionInfoFromDetailRow({
        ...readyColumns,
        nutrition_status: 'pending',
      }),
    ).toBeNull();
  });
});

describe('mapCommunityRatingFromRow', () => {
  test('returns rounded average when count is positive', () => {
    expect(
      mapCommunityRatingFromRow({
        community_rating_average: 3.56,
        community_rating_count: 4,
      }),
    ).toEqual({average: 3.6, count: 4, hasStaleRatings: false});
  });

  test('returns null for missing or zero ratings', () => {
    expect(
      mapCommunityRatingFromRow({
        community_rating_average: null,
        community_rating_count: 0,
      }),
    ).toBeNull();
    expect(
      mapCommunityRatingFromRow({
        community_rating_average: 4,
        community_rating_count: 0,
      }),
    ).toBeNull();
    expect(
      mapCommunityRatingFromRow({
        community_rating_average: null,
        community_rating_count: 3,
      }),
    ).toBeNull();
  });
});
