import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../test/fixtures/versionRow.js';

import {
  mapRowToRecipeDetail,
  mapRowToVersionDetail,
} from './mapRowToRecipeDetail.js';
import {normalizeRecipeTips} from './recipeTips.js';

// #635: the normalization every version save path applies, and the
// version-detail mapper's handling of rows with and without tips.
describe('normalizeRecipeTips', () => {
  test('returns an empty list for null and undefined', () => {
    expect(normalizeRecipeTips(null)).toEqual([]);
    expect(normalizeRecipeTips(undefined)).toEqual([]);
  });

  test('trims entries, drops blanks, and preserves order', () => {
    expect(
      normalizeRecipeTips(['  Second  ', '', '   ', 'First-ish', 'Third']),
    ).toEqual(['Second', 'First-ish', 'Third']);
  });

  test('returns an empty list for an empty list', () => {
    expect(normalizeRecipeTips([])).toEqual([]);
  });
});

describe('mapRowToVersionDetail tips (#635)', () => {
  test('maps the stored tips onto the version detail', () => {
    const detail = mapRowToVersionDetail(
      makeVersionDetailRow({tips: ['Tip A', 'Tip B']}),
    );
    expect(detail.tips).toEqual(['Tip A', 'Tip B']);
  });

  test('defaults to an empty list when the row carries no tips', () => {
    const row = makeVersionDetailRow();
    const detail = mapRowToVersionDetail({
      ...row,
      tips: undefined,
    } as Parameters<typeof mapRowToVersionDetail>[0]);
    expect(detail.tips).toEqual([]);
  });
});

describe('mapRowToRecipeDetail tips (#635 tranche 2)', () => {
  test('maps the active version tips onto the recipe detail', () => {
    const detail = mapRowToRecipeDetail(
      makeRecipeDetailRow({tips: ['Tip A', 'Tip B']}),
    );
    expect(detail.tips).toEqual(['Tip A', 'Tip B']);
  });

  test('defaults to an empty list when the row carries no tips', () => {
    const row = makeRecipeDetailRow();
    const detail = mapRowToRecipeDetail({
      ...row,
      tips: undefined,
    } as Parameters<typeof mapRowToRecipeDetail>[0]);
    expect(detail.tips).toEqual([]);
  });
});
