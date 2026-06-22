import {computeCommunityRating} from './computeCommunityRating.js';

describe('computeCommunityRating', () => {
  test('returns null when there are no ratings', () => {
    expect(computeCommunityRating([], 2)).toBeNull();
  });

  test('averages current-revision ratings at full weight', () => {
    expect(
      computeCommunityRating(
        [
          {stars: 4, contentRevision: 2},
          {stars: 2, contentRevision: 2},
        ],
        2,
      ),
    ).toEqual({average: 3, count: 2});
  });

  test('applies half weight to stale revision ratings', () => {
    expect(
      computeCommunityRating(
        [
          {stars: 5, contentRevision: 1},
          {stars: 3, contentRevision: 2},
        ],
        2,
      ),
    ).toEqual({average: 3.7, count: 2});
  });
});
