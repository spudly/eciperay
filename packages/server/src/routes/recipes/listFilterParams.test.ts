import {
  DEFAULT_RECIPE_LIST_LIMIT,
  MAX_RECIPE_LIST_LIMIT,
  communityRatingSelectSql,
  filterBindValues,
  ingredientFilterSql,
  nutritionFilterSql,
  nutritionSelectSql,
  orderBySql,
  parseLimit,
  parseOffset,
  parseOptionalNumber,
  parseOptionalSearch,
  parseRecipeListFilterParams,
  parseSort,
  parseSortDir,
  parseStatusFilter,
} from './listFilterParams.js';

describe('listFilterParams parsers', () => {
  test('parseOptionalSearch trims and rejects non-strings', () => {
    expect(parseOptionalSearch('  pasta  ')).toBe('pasta');
    expect(parseOptionalSearch('   ')).toBeNull();
    expect(parseOptionalSearch(1)).toBeNull();
  });

  test('parseLimit and parseOffset clamp invalid values', () => {
    expect(parseLimit()).toBe(DEFAULT_RECIPE_LIST_LIMIT);
    expect(parseLimit(0)).toBe(DEFAULT_RECIPE_LIST_LIMIT);
    expect(parseLimit(MAX_RECIPE_LIST_LIMIT + 10)).toBe(MAX_RECIPE_LIST_LIMIT);
    expect(parseLimit(25)).toBe(25);
    expect(parseOffset()).toBe(0);
    expect(parseOffset(-1)).toBe(0);
    expect(parseOffset(12)).toBe(12);
  });

  test('parseStatusFilter accepts known statuses', () => {
    expect(parseStatusFilter()).toBeNull();
    expect(parseStatusFilter('')).toBeNull();
    expect(parseStatusFilter('idea')).toBe('idea');
    expect(parseStatusFilter('nope')).toBe('invalid');
  });

  test('parseOptionalNumber and sort parsers', () => {
    expect(parseOptionalNumber()).toBeNull();
    expect(parseOptionalNumber('')).toBeNull();
    expect(parseOptionalNumber('12.5')).toBe(12.5);
    expect(parseOptionalNumber('x')).toBeNull();
    expect(parseSort()).toBe('newest');
    expect(parseSort('', 'rating')).toBe('rating');
    expect(parseSort('satiety')).toBe('satiety');
    expect(parseSort('bad')).toBe('invalid');
    expect(parseSortDir()).toBe('desc');
    expect(parseSortDir('', 'asc')).toBe('asc');
    expect(parseSortDir('asc')).toBe('asc');
    expect(parseSortDir('nope')).toBe('invalid');
  });
});

describe('parseRecipeListFilterParams', () => {
  test('reads query bag with defaults and overrides', () => {
    expect(parseRecipeListFilterParams({query: {}})).toMatchObject({
      limit: DEFAULT_RECIPE_LIST_LIMIT,
      offset: 0,
      sort: 'newest',
      sortDir: 'desc',
      status: null,
    });
    expect(
      parseRecipeListFilterParams(
        {
          query: {
            limit: '10',
            offset: '5',
            search: 'soup',
            status: 'evolving',
            ingredient: 'onion',
            minCalories: '100',
            maxCalories: '500',
            minProteinG: '10',
            maxProteinG: '40',
            minSatiety: '20',
            maxSatiety: '90',
            sort: 'calories',
            sortDir: 'asc',
          },
        },
        {defaultSort: 'rating', defaultSortDir: 'asc'},
      ),
    ).toMatchObject({
      limit: 10,
      offset: 5,
      search: 'soup',
      status: 'evolving',
      ingredient: 'onion',
      minCalories: 100,
      maxCalories: 500,
      minProteinG: 10,
      maxProteinG: 40,
      minSatiety: 20,
      maxSatiety: 90,
      sort: 'calories',
      sortDir: 'asc',
    });
  });
});

describe('listFilterParams sql helpers', () => {
  test('builds filter sql fragments and order by clauses', () => {
    expect(nutritionFilterSql(3)).toContain('$3::float8');
    expect(ingredientFilterSql(2)).toContain('$2::text');
    expect(communityRatingSelectSql).toContain('community_rating_average');
    expect(nutritionSelectSql).toContain('rv.satiety_score');
    expect(orderBySql('rating', 'asc')).toContain(
      'community_rating_average asc nulls first',
    );
    expect(orderBySql('satiety', 'desc')).toContain(
      'rv.satiety_score desc nulls last',
    );
    expect(orderBySql('calories', 'asc')).toContain('rv.calories asc');
    expect(orderBySql('newest', 'desc')).toBe('rv.updated_at desc');
    expect(orderBySql('newest', 'asc', {fallback: 'r.created_at asc'})).toBe(
      'r.created_at asc',
    );
    expect(
      filterBindValues(
        parseRecipeListFilterParams({
          query: {
            ingredient: 'egg',
            minCalories: '1',
            maxCalories: '2',
            minProteinG: '3',
            maxProteinG: '4',
            minSatiety: '5',
            maxSatiety: '6',
          },
        }),
      ),
    ).toEqual(['egg', 1, 2, 3, 4, 5, 6]);
  });
});
