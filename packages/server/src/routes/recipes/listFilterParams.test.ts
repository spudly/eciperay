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
  titleOrDescriptionSearchFilterSql,
  titleSearchFilterSql,
} from './listFilterParams.js';

describe('listFilterParams parsers', () => {
  test('parseOptionalSearch trims and rejects non-strings', () => {
    expect(parseOptionalSearch('  pasta  ')).toBe('pasta');
    expect(parseOptionalSearch('   ')).toBeNull();
    expect(parseOptionalSearch(1)).toBeNull();
  });

  test('parseOptionalSearch collapses irregular whitespace to single spaces (#385)', () => {
    expect(parseOptionalSearch('First   Soup')).toBe('First Soup');
    expect(parseOptionalSearch('First\tSoup')).toBe('First Soup');
    // Non-breaking spaces (e.g. pasted search text) separate words too.
    expect(parseOptionalSearch('First\u00A0Soup')).toBe('First Soup');
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

// A search word with the ILIKE metacharacters escaped (backslash,
// then %, then _), as the helpers embed it: words match literally, so
// "50%" does not match "50g" and "a_b" does not match "axb".
const escapedSearchTokenSql =
  "replace(replace(replace(search_token.token, '\\', '\\\\'), '%', '\\%'), '_', '\\_')";

describe('title search sql (#385)', () => {
  test('matches every search word as a title substring, not a phrase or prefix', () => {
    const sql = titleSearchFilterSql(4);
    // The search bind keeps its position and may be null (no search).
    expect(sql).toContain('$4::text is null');
    // Words come from splitting the one search value on whitespace…
    expect(sql).toContain("regexp_split_to_array($4, '\\s+')");
    // …and a title matches only when NO word is absent from it: each
    // word is a case-insensitive substring check against the title, so
    // "First" and "First Soup" both match "QA — First Soup" (a word in
    // the middle of the title, not only a title prefix or a contiguous
    // phrase).
    expect(sql).toContain('not exists');
    expect(sql).toContain(
      `rv.title not ilike '%' || ${escapedSearchTokenSql} || '%'`,
    );
    // The old single-phrase match against the raw search value is gone.
    expect(sql).not.toContain("rv.title ilike '%' || $4 || '%'");
  });

  test('public variant lets each word match the title or the description', () => {
    const sql = titleOrDescriptionSearchFilterSql(3);
    expect(sql).toContain('$3::text is null');
    expect(sql).toContain("regexp_split_to_array($3, '\\s+')");
    expect(sql).toContain(
      `rv.title not ilike '%' || ${escapedSearchTokenSql} || '%'`,
    );
    expect(sql).toContain(
      `coalesce(rv.description, '') not ilike '%' || ${escapedSearchTokenSql} || '%'`,
    );
  });
});

describe('listFilterParams sql helpers', () => {
  test('builds filter sql fragments and order by clauses', () => {
    expect(nutritionFilterSql(3)).toContain('$3::float8');
    expect(ingredientFilterSql(2)).toContain('$2::text');
    expect(communityRatingSelectSql).toContain('community_rating_average');
    expect(nutritionSelectSql).toContain('rv.satiety_score');
    expect(orderBySql('rating', 'asc')).toBe(
      'community_rating_average asc nulls first, rv.updated_at desc, rv.id desc',
    );
    expect(orderBySql('satiety', 'desc')).toBe(
      'rv.satiety_score desc nulls last, rv.updated_at desc, rv.id desc',
    );
    expect(orderBySql('calories', 'asc')).toBe(
      'rv.calories asc nulls first, rv.updated_at desc, rv.id desc',
    );
    // The unique rv.id tie-breaker makes the order total, so offset
    // pagination cannot skip or duplicate rows that tie on updated_at
    // across a page boundary (#359).
    expect(orderBySql('newest', 'desc')).toBe('rv.updated_at desc, rv.id desc');
    expect(orderBySql('newest', 'asc')).toBe('rv.updated_at asc, rv.id asc');
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
