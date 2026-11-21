import {
  buildSearchQuerySql,
  EMPTY_SEARCH_QUERY,
  escapeLikePattern,
  FUZZY_MIN_WORD_LENGTH,
  FUZZY_SIMILARITY_THRESHOLD,
  parseSearchSyntax,
  relevanceScoreSql,
} from './searchQuery.js';

describe('parseSearchSyntax', () => {
  test('empty and whitespace input parse to an empty query', () => {
    expect(parseSearchSyntax(null)).toEqual(EMPTY_SEARCH_QUERY);
    expect(parseSearchSyntax('')).toEqual(EMPTY_SEARCH_QUERY);
    expect(parseSearchSyntax('   ')).toEqual(EMPTY_SEARCH_QUERY);
  });

  test('plain words are free text, ANDed word by word', () => {
    expect(parseSearchSyntax('chicken soup').freeText).toEqual([
      {value: 'chicken', phrase: false, negated: false},
      {value: 'soup', phrase: false, negated: false},
    ]);
  });

  test('quoted phrases stay together, including negated phrases', () => {
    expect(
      parseSearchSyntax('"chicken soup" -"peanut sauce"').freeText,
    ).toEqual([
      {value: 'chicken soup', phrase: true, negated: false},
      {value: 'peanut sauce', phrase: true, negated: true},
    ]);
  });

  test('field qualifiers scope the match, desc/description are aliases', () => {
    const parsed = parseSearchSyntax(
      'title:soup desc:spicy description:hot ingredient:garlic tag:dinner',
    );
    expect(parsed.fieldFilters).toEqual([
      {field: 'title', values: ['soup'], negated: false},
      {field: 'description', values: ['spicy'], negated: false},
      {field: 'description', values: ['hot'], negated: false},
      {field: 'ingredient', values: ['garlic'], negated: false},
      {field: 'tag', values: ['dinner'], negated: false},
    ]);
  });

  test('comma-separated values are kept together for OR-within-qualifier', () => {
    expect(parseSearchSyntax('tag:dinner,quick').fieldFilters).toEqual([
      {field: 'tag', values: ['dinner', 'quick'], negated: false},
    ]);
  });

  test('negated qualifiers and words keep their negation', () => {
    const parsed = parseSearchSyntax('-ingredient:peanuts -tag:spicy -bland');
    expect(parsed.fieldFilters).toEqual([
      {field: 'ingredient', values: ['peanuts'], negated: true},
      {field: 'tag', values: ['spicy'], negated: true},
    ]);
    expect(parsed.freeText).toEqual([
      {value: 'bland', phrase: false, negated: true},
    ]);
  });

  test('status: and is: qualifiers map statuses and scopes', () => {
    const parsed = parseSearchSyntax('status:perfected is:public is:mine');
    expect(parsed.statuses).toEqual([{values: ['perfected'], negated: false}]);
    expect(parsed.scopes).toEqual([
      {values: ['public'], negated: false},
      {values: ['mine'], negated: false},
    ]);
    expect(parseSearchSyntax('is:evolving').statuses).toEqual([
      {values: ['evolving'], negated: false},
    ]);
  });

  test('numeric qualifiers parse every comparison operator', () => {
    const parsed = parseSearchSyntax(
      'rating:>=4 calories:<600 protein:>30 satiety:7',
    );
    expect(parsed.numeric).toEqual([
      {field: 'rating', comparison: '>=', value: 4, negated: false},
      {field: 'calories', comparison: '<', value: 600, negated: false},
      {field: 'protein', comparison: '>', value: 30, negated: false},
      {field: 'satiety', comparison: '=', value: 7, negated: false},
    ]);
  });

  test('unknown qualifiers degrade to free text, colon included', () => {
    expect(parseSearchSyntax('color:red soup').freeText).toEqual([
      {value: 'color:red', phrase: false, negated: false},
      {value: 'soup', phrase: false, negated: false},
    ]);
  });

  test('quoted qualifier values parse as qualifiers, not free text', () => {
    expect(parseSearchSyntax('title:"chicken soup"').fieldFilters).toEqual([
      {field: 'title', values: ['chicken soup'], negated: false},
    ]);
    expect(parseSearchSyntax('-title:"chicken soup"').fieldFilters).toEqual([
      {field: 'title', values: ['chicken soup'], negated: true},
    ]);
    // A quoted value with no qualifier stays an unqualified phrase.
    expect(parseSearchSyntax('"chicken soup"').freeText).toEqual([
      {value: 'chicken soup', phrase: true, negated: false},
    ]);
  });

  test('inherited object names are not qualifiers (constructor: falls back)', () => {
    expect(parseSearchSyntax('constructor:soup').freeText).toEqual([
      {value: 'constructor:soup', phrase: false, negated: false},
    ]);
    expect(parseSearchSyntax('title:soup').fieldFilters).toEqual([
      {field: 'title', values: ['soup'], negated: false},
    ]);
  });

  test('partially valid qualifier lists hint each invalid member', () => {
    const parsed = parseSearchSyntax('status:perfected,typo is:mine,bogus');
    expect(parsed.statuses).toEqual([{values: ['perfected'], negated: false}]);
    expect(parsed.scopes).toEqual([{values: ['mine'], negated: false}]);
    expect(parsed.hints).toHaveLength(2);
    expect(parsed.hints[0]).toContain('typo');
    expect(parsed.hints[1]).toContain('bogus');
    // Wholly invalid lists still produce hints and no filters.
    const wholly = parseSearchSyntax('status:nope,nah');
    expect(wholly.statuses).toEqual([]);
    expect(wholly.scopes).toEqual([]);
    expect(wholly.hints).toHaveLength(2);
  });

  test('invalid qualifier values become hints, not filters', () => {
    const parsed = parseSearchSyntax('calories:lots status:unknown title:');
    expect(parsed.numeric).toEqual([]);
    expect(parsed.statuses).toEqual([]);
    expect(parsed.fieldFilters).toEqual([]);
    expect(parsed.hints).toHaveLength(3);
  });
});

describe('escapeLikePattern', () => {
  test('escapes backslash, percent, and underscore literally', () => {
    expect(escapeLikePattern('50%')).toBe('50\\%');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });
});

describe('buildSearchQuerySql', () => {
  test('empty query compiles to no conditions and no values', () => {
    expect(buildSearchQuerySql(EMPTY_SEARCH_QUERY, 12, 'mine')).toEqual({
      sql: '',
      values: [],
    });
  });

  test('free words match title, description, or an ingredient name', () => {
    const {sql, values} = buildSearchQuerySql(
      parseSearchSyntax('garlic'),
      12,
      'mine',
    );
    // 'garlic' is fuzzy-eligible (#612), so the raw word is bound again for
    // the similarity clauses.
    expect(values).toEqual(['%garlic%', 'garlic']);
    expect(sql).toContain("rv.title ilike $12 escape '\\'");
    expect(sql).toContain("coalesce(rv.description, '') ilike $12");
    expect(sql).toContain('exists (select 1 from ingredients i');
    expect(sql).toContain('i.name ilike $12');
  });

  test('fuzzy similarity widens eligible words only (#612)', () => {
    const {sql, values} = buildSearchQuerySql(
      parseSearchSyntax('chiken'),
      12,
      'mine',
    );
    expect(values).toEqual(['%chiken%', 'chiken']);
    expect(sql).toContain(
      `similarity(rv.title, $13) > ${FUZZY_SIMILARITY_THRESHOLD}`,
    );
    expect(sql).toContain(
      `similarity(i.name, $13) > ${FUZZY_SIMILARITY_THRESHOLD}`,
    );
    // The exact ILIKE condition is still present and ORed, never replaced.
    expect(sql).toContain("rv.title ilike $12 escape '\\'");
  });

  test('short words, phrases, negations, and qualifiers stay exact-only (#612)', () => {
    // Short word (< FUZZY_MIN_WORD_LENGTH).
    expect(FUZZY_MIN_WORD_LENGTH).toBe(4);
    const short = buildSearchQuerySql(parseSearchSyntax('egg'), 12, 'mine');
    expect(short.values).toEqual(['%egg%']);
    expect(short.sql).not.toContain('similarity');
    // Quoted phrase.
    const phrase = buildSearchQuerySql(
      parseSearchSyntax('"chicken soup"'),
      12,
      'mine',
    );
    expect(phrase.values).toEqual(['%chicken soup%']);
    expect(phrase.sql).not.toContain('similarity');
    // Negated word: exclusions never widen.
    const negated = buildSearchQuerySql(
      parseSearchSyntax('-chicken'),
      12,
      'mine',
    );
    expect(negated.values).toEqual(['%chicken%']);
    expect(negated.sql).not.toContain('similarity');
    expect(negated.sql).toContain('not (');
    // Field qualifier.
    const qualifier = buildSearchQuerySql(
      parseSearchSyntax('title:chicken'),
      12,
      'mine',
    );
    expect(qualifier.values).toEqual(['%chicken%']);
    expect(qualifier.sql).not.toContain('similarity');
  });

  test('a phrase binds as one contiguous pattern', () => {
    const {values} = buildSearchQuerySql(
      parseSearchSyntax('"chicken soup"'),
      12,
      'mine',
    );
    expect(values).toEqual(['%chicken soup%']);
  });

  test('field qualifiers compile to scoped conditions with OR values', () => {
    const {sql, values} = buildSearchQuerySql(
      parseSearchSyntax('tag:dinner,quick ingredient:garlic'),
      12,
      'mine',
    );
    expect(values).toEqual(['%dinner%', '%quick%', '%garlic%']);
    expect(sql).toContain('from recipe_tags srt join tags st');
    expect(sql).toContain('st.name ilike $12');
    expect(sql).toContain('st.name ilike $13');
    expect(sql).toContain('i.name ilike $14');
  });

  test('negation wraps the condition in NOT', () => {
    const {sql} = buildSearchQuerySql(
      parseSearchSyntax('-ingredient:peanuts'),
      12,
      'mine',
    );
    expect(sql).toContain('not (');
    expect(sql).toContain('i.name ilike $12');
  });

  test('status and scope qualifiers compile to status/visibility conditions', () => {
    const {sql, values} = buildSearchQuerySql(
      parseSearchSyntax('status:perfected is:public'),
      12,
      'mine',
    );
    expect(values).toEqual(['perfected']);
    expect(sql).toContain('r.status in ($12)');
    expect(sql).toContain("r.visibility = 'public'");
  });

  test('a scope that cannot match this endpoint excludes every row', () => {
    expect(
      buildSearchQuerySql(parseSearchSyntax('is:mine'), 12, 'public').sql,
    ).toContain('and (false)');
    expect(
      buildSearchQuerySql(parseSearchSyntax('is:shared'), 12, 'shared').sql,
    ).not.toContain('false');
  });

  test('scope alternatives in one token are ORed, not ANDed', () => {
    // mine matches every row on the mine endpoint, so the group adds
    // no constraint — it must not exclude private owned recipes.
    expect(
      buildSearchQuerySql(parseSearchSyntax('is:mine,public'), 12, 'mine'),
    ).toEqual({sql: '', values: []});
    // On public, shared matches nothing and public is the visibility
    // condition: the OR group is just the visibility condition.
    const {sql} = buildSearchQuerySql(
      parseSearchSyntax('is:shared,public'),
      12,
      'public',
    );
    expect(sql).toContain("r.visibility = 'public'");
    expect(sql).not.toContain('false');
    // Separate tokens stay ANDed.
    const separate = buildSearchQuerySql(
      parseSearchSyntax('is:public status:perfected'),
      12,
      'mine',
    );
    expect(separate.sql).toContain("r.visibility = 'public'");
    expect(separate.sql).toContain('r.status in ($12)');
  });

  test('mixed status/scope alternatives in one token form one OR group', () => {
    const {sql, values} = buildSearchQuerySql(
      parseSearchSyntax('is:perfected,public'),
      12,
      'mine',
    );
    expect(values).toEqual(['perfected']);
    expect(sql).toContain("(r.status in ($12) or r.visibility = 'public')");
    // Exactly one ANDed condition for the whole token.
    expect(sql.match(/and \(/g)).toHaveLength(1);
  });

  test('numeric qualifiers compile to comparisons on the range columns', () => {
    const {sql, values} = buildSearchQuerySql(
      parseSearchSyntax('rating:>=4 calories:<600 protein:>30 satiety:>=7'),
      12,
      'mine',
    );
    expect(values).toEqual([4, 600, 30, 7]);
    expect(sql).toContain('r.star_rating >= $12');
    expect(sql).toContain('rv.calories < $13');
    expect(sql).toContain('rv.protein_g > $14');
    expect(sql).toContain('rv.satiety_score >= $15');
  });

  test('percent and underscore in values are escaped in the bind pattern (short words stay exact)', () => {
    const {sql, values} = buildSearchQuerySql(
      parseSearchSyntax('50% a_b'),
      12,
      'mine',
    );
    expect(values).toEqual(['%50\\%%', '%a\\_b%']);
    expect(sql).toContain("escape '\\'");
  });
});

describe('relevanceScoreSql (#612)', () => {
  test('empty query scores every row 0 with no bind values', () => {
    expect(relevanceScoreSql(EMPTY_SEARCH_QUERY, 12)).toEqual({
      sql: '0',
      values: [],
    });
  });

  test('title whole-word outranks substring, ingredient, then description', () => {
    const {sql, values} = relevanceScoreSql(
      parseSearchSyntax('chicken'),
      12,
    );
    // Bind order: substring pattern, whole-word regex, raw word (similarity).
    expect(values).toEqual(['%chicken%', '\\ychicken\\y', 'chicken']);
    expect(sql).toContain('rv.title ~* $13 then 100');
    expect(sql).toContain("rv.title ilike $12 escape '\\' then 50");
    expect(sql).toContain('i.name ilike $12');
    expect(sql).toContain('then 30');
    expect(sql).toContain("coalesce(rv.description, '') ilike $12");
    expect(sql).toContain('then 20');
    // Similarity contributes a bounded bonus, weighted by the score itself.
    expect(sql).toContain('similarity(rv.title, $14) * 10');
    expect(sql).toContain('max(similarity(i.name, $14))');
  });

  test('negated terms contribute nothing', () => {
    expect(
      relevanceScoreSql(parseSearchSyntax('-chicken'), 12),
    ).toEqual({sql: '0', values: []});
  });

  test('field qualifiers contribute their field weight', () => {
    const {sql, values} = relevanceScoreSql(
      parseSearchSyntax('title:soup ingredient:garlic'),
      12,
    );
    expect(values).toEqual(['%soup%', '%garlic%']);
    expect(sql).toContain("rv.title ilike $12 escape '\\' then 50");
    expect(sql).toContain('i.name ilike $13');
    expect(sql).toContain('then 30');
    expect(sql).not.toContain('similarity');
  });

  test('phrases score as substring matches without whole-word or fuzzy parts', () => {
    const {sql, values} = relevanceScoreSql(
      parseSearchSyntax('"chicken soup"'),
      12,
    );
    expect(values).toEqual(['%chicken soup%']);
    expect(sql).not.toContain('~*');
    expect(sql).not.toContain('similarity');
  });
});
