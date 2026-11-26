import {makeVersionDetailRow} from '../test/fixtures/versionRow.js';

import {mapRowToVersionDetail} from './mapRowToRecipeDetail.js';
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
