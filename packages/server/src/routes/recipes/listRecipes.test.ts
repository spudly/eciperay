import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

import {
  DEFAULT_RECIPE_LIST_LIMIT,
  MAX_RECIPE_LIST_LIMIT,
  parseStatusFilter,
  parseListParams,
} from './listRecipes.js';
import {EMPTY_SEARCH_QUERY, parseSearchSyntax} from './searchQuery.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const emptyFilterBinds = [null, null, null, null, null, null, null];

const defaultParsedListParams = {
  limit: DEFAULT_RECIPE_LIST_LIMIT,
  offset: 0,
  search: null,
  searchQuery: EMPTY_SEARCH_QUERY,
  status: null,
  ingredient: null,
  minCalories: null,
  maxCalories: null,
  minProteinG: null,
  maxProteinG: null,
  minSatiety: null,
  maxSatiety: null,
  sort: 'newest' as const,
  sortDir: 'desc' as const,
};

describe('parseListParams', () => {
  test('defaults limit, offset, and search', () => {
    expect(parseListParams({query: {}})).toEqual(defaultParsedListParams);
  });

  test('parses search and caps limit', () => {
    expect(
      parseListParams({
        query: {search: '  pasta  ', limit: '9999', offset: '5'},
      }),
    ).toEqual({
      ...defaultParsedListParams,
      limit: MAX_RECIPE_LIST_LIMIT,
      offset: 5,
      search: 'pasta',
      searchQuery: parseSearchSyntax('pasta'),
      // A search with no explicit sort defaults to relevance (#612).
      sort: 'relevance',
    });
  });

  test('ignores blank and non-string search values', () => {
    expect(parseListParams({query: {search: '   '}}).search).toBeNull();
    expect(parseListParams({query: {search: 123}}).search).toBeNull();
  });

  test('falls back for invalid limit and offset', () => {
    expect(parseListParams({query: {limit: 'bad', offset: '-1'}})).toEqual(
      defaultParsedListParams,
    );
  });

  test('parses status filter', () => {
    expect(parseStatusFilter('perfected')).toBe('perfected');
    expect(parseStatusFilter('evolving')).toBe('evolving');
    expect(parseStatusFilter('')).toBeNull();
    expect(parseStatusFilter('draft')).toBe('invalid');
  });

  test('parses nutrition and sort filters', () => {
    expect(
      parseListParams({
        query: {
          ingredient: 'chicken',
          minCalories: '100',
          maxSatiety: '80',
          sort: 'satiety',
          sortDir: 'asc',
        },
      }),
    ).toMatchObject({
      ingredient: 'chicken',
      minCalories: 100,
      maxSatiety: 80,
      sort: 'satiety',
      sortDir: 'asc',
    });
  });
});

describe('GET /recipes', () => {
  test('returns 200 with recipe list', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'recipe-uuid-1',
          status: 'evolving',
          visibility: 'private',
          slug: 'test-recipe',
          content_revision: 1,
          cloned_from_recipe_id: null,
          title: 'Test Recipe',
          description: 'A test recipe',
          servings: 4,
          prep_time_min: 15,
          cook_time_min: 30,
          image_url: null,
          star_rating: null,
          source_url: null,
          active_version_id: 'version-uuid-1',
          version_id: 'version-uuid-1',
          version_number: 1,
          created_via: 'manual',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          tags: [],
          calories: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          fiber_g: null,
          sugar_g: null,
          sodium_mg: null,
          prepared_weight_g: null,
          satiety_score: null,
          nutrition_status: null,
          nutrition_disclaimer: null,
          nutrition_updated_at: null,
          community_rating_average: null,
          community_rating_count: 0,
        },
      ]),
    );
    const res = await request(getApp())
      .get('/api/recipes')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      title: 'Test Recipe',
      imageUrl: null,
      cookTimeMin: 30,
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      DEFAULT_RECIPE_LIST_LIMIT,
      0,
      null,
      ...emptyFilterBinds,
    ]);
  });

  test('passes search to the query', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes')
      .query({search: 'pasta'})
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      DEFAULT_RECIPE_LIST_LIMIT,
      0,
      null,
      ...emptyFilterBinds,
      // Search condition: LIKE pattern + raw word for fuzzy similarity.
      '%pasta%',
      'pasta',
      // Relevance score (the default sort while searching, #612): pattern,
      // whole-word regex, raw word.
      '%pasta%',
      '\\ypasta\\y',
      'pasta',
    ]);
    const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]?.[0];
    expect(sql).toContain('similarity(rv.title, $13::text)');
    expect(sql).toContain('desc, rv.updated_at desc, rv.id desc');
  });

  test('a typo search compiles to the similarity condition (#612)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes')
      .query({search: 'chiken'})
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]?.[0];
    expect(sql).toContain('similarity(rv.title, $13::text) > 0.3');
    expect(sql).toContain('similarity(i.name, $13::text) > 0.3');
  });

  test('an explicit sort with a search still orders by that sort (#612)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes')
      .query({search: 'pasta', sort: 'newest'})
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]?.[0];
    expect(sql).toContain('order by rv.updated_at desc, rv.id desc');
    expect(sql).not.toContain('~*');
    // Only the search condition's own fuzzy bind is present.
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      DEFAULT_RECIPE_LIST_LIMIT,
      0,
      null,
      ...emptyFilterBinds,
      '%pasta%',
      'pasta',
    ]);
  });

  test('passes a multi-word search to the query as per-word patterns (#611)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes')
      .query({search: 'First Soup'})
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      DEFAULT_RECIPE_LIST_LIMIT,
      0,
      null,
      ...emptyFilterBinds,
      // Per word: LIKE pattern + raw fuzzy word; then the relevance
      // score's pattern / whole-word / raw binds per word (#612).
      '%First%',
      'First',
      '%Soup%',
      'Soup',
      '%First%',
      '\\yFirst\\y',
      'First',
      '%Soup%',
      '\\ySoup\\y',
      'Soup',
    ]);
  });

  test('searches free words across title, description, and ingredients (#611)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes')
      .query({search: 'First Soup'})
      .set('Authorization', 'Bearer <redacted>');
    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]?.[0];
    // Each word compiles to its own parameterized condition that may match
    // the title, the description, or an ingredient name (#611 broadening
    // the #385 word-by-word title rule).
    expect(sql).toContain("rv.title ilike $12 escape '\\'");
    expect(sql).toContain("coalesce(rv.description, '') ilike $12");
    expect(sql).toContain('exists (select 1 from ingredients i');
    // $13 is the first word's raw fuzzy bind; the second word's pattern
    // follows at $14 (#612).
    expect(sql).toContain("rv.title ilike $14 escape '\\'");
  });

  test('passes status filter to the query', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes')
      .query({status: 'evolving'})
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      DEFAULT_RECIPE_LIST_LIMIT,
      0,
      'evolving',
      ...emptyFilterBinds,
    ]);
  });

  test('returns 400 for invalid status filter', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .get('/api/recipes')
      .query({status: 'draft'})
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('returns 400 for invalid sort or sortDir', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const badSort = await request(getApp())
      .get('/api/recipes')
      .query({sort: 'popular'})
      .set('Authorization', 'Bearer valid-token');
    expect(badSort.status).toBe(400);
    expect(badSort.body.error).toMatch(/sort/i);

    nockSupabaseGetUser('user-uuid-1');
    const badDir = await request(getApp())
      .get('/api/recipes')
      .query({sortDir: 'sideways'})
      .set('Authorization', 'Bearer valid-token');
    expect(badDir.status).toBe(400);
    expect(badDir.body.error).toMatch(/sortDir/i);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('passes limit and offset query params', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes?limit=500&offset=40')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      500,
      40,
      null,
      ...emptyFilterBinds,
    ]);
  });

  test('caps limit at 500', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await request(getApp())
      .get('/api/recipes?limit=9999')
      .set('Authorization', 'Bearer valid-token');
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      500,
      0,
      null,
      ...emptyFilterBinds,
    ]);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).get('/api/recipes');
    expect(res.status).toBe(401);
  });

  test('returns 401 when token is invalid', async () => {
    const {nockSupabaseGetUserError} =
      await import('../../test/mockNockSupabase.js');
    nockSupabaseGetUserError();
    const res = await request(getApp())
      .get('/api/recipes')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
  });
});
