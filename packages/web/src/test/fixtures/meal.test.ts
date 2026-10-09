import {
  makeMealCookPlan,
  makeMealDetail,
  makeMealPlanDetail,
  makeMealPlanSummary,
  makeMealSummary,
} from './meal.js';

describe('meal fixtures', () => {
  test('builds summary and detail fixtures', () => {
    expect(makeMealSummary().title).toBe('Sunday Dinner');
    expect(makeMealDetail().members[0]?.title).toBe('Test Recipe');
  });

  test('builds plan and cook plan fixtures', () => {
    expect(makeMealPlanSummary().entryCount).toBe(0);
    expect(makeMealPlanDetail().entries).toEqual([]);
    expect(makeMealCookPlan().steps[0]?.body).toBe('Mix dry ingredients');
  });
});
