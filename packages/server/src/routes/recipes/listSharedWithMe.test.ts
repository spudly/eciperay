import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

import {
  buildSearchQuerySql,
  parseSearchSyntax,
  relevanceScoreSql,
} from './searchQuery.js';
import {
  buildListSharedWithMeSql,
  LIST_SHARED_WITH_ME_SQL,
} from './sqlConstants.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('GET /recipes/shared-with-me', () => {
  test('returns paginated recipes shared with the signed-in user', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeRecipeDetailRow({
          id: 'shared-recipe-1',
          user_id: 'owner-uuid',
          title: 'Shared Pasta',
        }),
      ]),
    );

    const res = await request(getApp())
      .get('/api/recipes/shared-with-me?limit=25&offset=5')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Shared Pasta');
    expect(mockQuery).toHaveBeenCalledWith(LIST_SHARED_WITH_ME_SQL, [
      'user-uuid-1',
      25,
      5,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  test('requires authentication', async () => {
    const res = await request(getApp()).get('/api/recipes/shared-with-me');
    expect(res.status).toBe(401);
  });

  test('orders by satiety when requested', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/shared-with-me?sort=satiety&sortDir=asc')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      buildListSharedWithMeSql('satiety', 'asc'),
      expect.any(Array),
    );
  });

  test('orders newest shared recipes ascending when requested', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/shared-with-me?sort=newest&sortDir=asc')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      buildListSharedWithMeSql('newest', 'asc'),
      expect.any(Array),
    );
    expect(buildListSharedWithMeSql('newest', 'asc')).toContain(
      'shared_granted_at asc',
    );
  });

  test('applies the compiled search query for search requests (#611)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/shared-with-me?search=garlic')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    // Base binds mirror the handler: user, limit, offset, then
    // the seven filter binds (ingredient + nutrition ranges), all null.
    const baseValues: (string | number | null)[] = [
      'user-uuid-1',
      100,
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const compiled = buildSearchQuerySql(
      parseSearchSyntax('garlic'),
      baseValues.length + 1,
      'shared',
    );
    // 'garlic' is fuzzy-eligible (#612): pattern + raw word.
    expect(compiled.values).toEqual(['%garlic%', 'garlic']);
    // A search with no explicit sort defaults to relevance (#612), so the
    // handler also appends the relevance score's binds.
    const relevance = relevanceScoreSql(
      parseSearchSyntax('garlic'),
      baseValues.length + compiled.values.length + 1,
    );
    expect(mockQuery).toHaveBeenCalledWith(
      buildListSharedWithMeSql(
        'relevance',
        'desc',
        compiled.sql,
        relevance.sql,
      ),
      [...baseValues, ...compiled.values, ...relevance.values],
    );
  });

  test('leaves search conditions to the compiled search query (#611)', () => {
    expect(LIST_SHARED_WITH_ME_SQL).not.toContain('search_token');
  });

  test('returns 400 for invalid filter params', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const badSort = await request(getApp())
      .get('/api/recipes/shared-with-me?sort=popular')
      .set('Authorization', 'Bearer valid-token');
    expect(badSort.status).toBe(400);

    nockSupabaseGetUser('user-uuid-1');
    const badDir = await request(getApp())
      .get('/api/recipes/shared-with-me?sortDir=sideways')
      .set('Authorization', 'Bearer valid-token');
    expect(badDir.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('Shared With Me family union (#617)', () => {
  test('unions family-shared recipes with a family marker', () => {
    const sql = buildListSharedWithMeSql('newest', 'desc');
    expect(sql).toContain('family_share_grants');
    expect(sql).toContain("'family'");
    expect(sql).toContain('shared_via');
  });

  test('individual grants win the badge when both grants exist', () => {
    const sql = buildListSharedWithMeSql('newest', 'desc');
    // One row per recipe (left joins, not a UNION of duplicates), and the
    // case prefers the per-recipe grant over the family grant.
    expect(sql).toContain(
      "case when g.recipe_id is not null then 'individual' else 'family' end",
    );
    expect(sql).not.toContain('union');
  });
});
