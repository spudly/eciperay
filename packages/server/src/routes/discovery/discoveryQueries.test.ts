import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {
  DISCOVERY_FEED_SQL,
  followUser,
  hideRecipe,
  listDiscoveryFeedRows,
  listFollows,
  listHiddenRecipes,
  listSavedRecipes,
  listShowLess,
  recordInterestSignal,
  saveRecipe,
  showLessLikeThis,
  undoShowLess,
  unfollowUser,
  unhideRecipe,
  unsaveRecipe,
} from './discoveryQueries.js';

describe('discoveryQueries', () => {
  test('saves a recipe idempotently and maps the row', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          user_id: 'user-uuid-1',
          recipe_id: 'recipe-uuid-1',
          created_at: '2026-11-21T00:00:00.000Z',
        },
      ]),
    );
    const saved = await saveRecipe('user-uuid-1', 'recipe-uuid-1', mockQuery);
    expect(saved).toEqual({
      userId: 'user-uuid-1',
      recipeId: 'recipe-uuid-1',
      createdAt: '2026-11-21T00:00:00.000Z',
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('saved_recipes'),
      ['user-uuid-1', 'recipe-uuid-1'],
    );
  });

  test('unsave reports whether a row was removed', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 1});
    await expect(
      unsaveRecipe('user-uuid-1', 'recipe-uuid-1', mockQuery),
    ).resolves.toBe(true);
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    await expect(
      unsaveRecipe('user-uuid-1', 'recipe-uuid-1', mockQuery),
    ).resolves.toBe(false);
  });

  test('lists saved recipes with titles', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          user_id: 'user-uuid-1',
          recipe_id: 'recipe-uuid-1',
          created_at: '2026-11-21T00:00:00.000Z',
          title: 'Soup',
        },
      ]),
    );
    await expect(
      listSavedRecipes('user-uuid-1', 100, 0, mockQuery),
    ).resolves.toEqual([
      {
        userId: 'user-uuid-1',
        recipeId: 'recipe-uuid-1',
        createdAt: '2026-11-21T00:00:00.000Z',
        title: 'Soup',
      },
    ]);
  });

  test('hides, unhides, and lists hidden recipes', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          user_id: 'user-uuid-1',
          recipe_id: 'recipe-uuid-1',
          created_at: '2026-11-21T00:00:00.000Z',
        },
      ]),
    );
    await expect(
      hideRecipe('user-uuid-1', 'recipe-uuid-1', mockQuery),
    ).resolves.toEqual({
      userId: 'user-uuid-1',
      recipeId: 'recipe-uuid-1',
      createdAt: '2026-11-21T00:00:00.000Z',
    });
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 1});
    await expect(
      unhideRecipe('user-uuid-1', 'recipe-uuid-1', mockQuery),
    ).resolves.toBe(true);
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          user_id: 'user-uuid-1',
          recipe_id: 'recipe-uuid-1',
          created_at: '2026-11-21T00:00:00.000Z',
          title: 'Soup',
        },
      ]),
    );
    await expect(
      listHiddenRecipes('user-uuid-1', 100, 0, mockQuery),
    ).resolves.toEqual([
      {
        userId: 'user-uuid-1',
        recipeId: 'recipe-uuid-1',
        createdAt: '2026-11-21T00:00:00.000Z',
        title: 'Soup',
      },
    ]);
  });

  test('follow rejects self and unknown users without inserting', async () => {
    const mockQuery = createMockQuery();
    await expect(
      followUser('user-uuid-1', 'user-uuid-1', mockQuery),
    ).resolves.toEqual({kind: 'self'});
    expect(mockQuery).not.toHaveBeenCalled();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await expect(
      followUser('user-uuid-1', 'missing-uuid', mockQuery),
    ).resolves.toEqual({kind: 'unknown_user'});
  });

  test('follow inserts and maps the followee identity', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            id: 'viewer-uuid',
            email: 'viewer@example.com',
            display_name: 'Viewer',
          },
        ]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            follower_id: 'user-uuid-1',
            followee_id: 'viewer-uuid',
            created_at: '2026-11-21T00:00:00.000Z',
          },
        ]),
      );
    await expect(
      followUser('user-uuid-1', 'viewer-uuid', mockQuery),
    ).resolves.toEqual({
      kind: 'ok',
      follow: {
        followerId: 'user-uuid-1',
        followeeId: 'viewer-uuid',
        followeeEmail: 'viewer@example.com',
        followeeDisplayName: 'Viewer',
        createdAt: '2026-11-21T00:00:00.000Z',
      },
    });
  });

  test('unfollow and list follows', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 1});
    await expect(
      unfollowUser('user-uuid-1', 'viewer-uuid', mockQuery),
    ).resolves.toBe(true);
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          follower_id: 'user-uuid-1',
          followee_id: 'viewer-uuid',
          followee_email: 'viewer@example.com',
          followee_display_name: null,
          created_at: '2026-11-21T00:00:00.000Z',
        },
      ]),
    );
    await expect(listFollows('user-uuid-1', mockQuery)).resolves.toEqual([
      {
        followerId: 'user-uuid-1',
        followeeId: 'viewer-uuid',
        followeeEmail: 'viewer@example.com',
        followeeDisplayName: null,
        createdAt: '2026-11-21T00:00:00.000Z',
      },
    ]);
  });

  test('records an interest signal with dwell time', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'signal-uuid-1',
          user_id: 'user-uuid-1',
          recipe_id: 'recipe-uuid-1',
          signal: 'interest',
          dwell_ms: 4200,
          created_at: '2026-11-21T00:00:00.000Z',
        },
      ]),
    );
    await expect(
      recordInterestSignal(
        {
          userId: 'user-uuid-1',
          recipeId: 'recipe-uuid-1',
          signal: 'interest',
          dwellMs: 4200,
        },
        mockQuery,
      ),
    ).resolves.toEqual({
      id: 'signal-uuid-1',
      userId: 'user-uuid-1',
      recipeId: 'recipe-uuid-1',
      signal: 'interest',
      dwellMs: 4200,
      createdAt: '2026-11-21T00:00:00.000Z',
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      'recipe-uuid-1',
      'interest',
      4200,
    ]);
  });

  test('show-less records, undoes, and lists sources with titles', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          user_id: 'user-uuid-1',
          source_recipe_id: 'recipe-uuid-1',
          created_at: '2026-11-23T00:00:00.000Z',
        },
      ]),
    );
    await expect(
      showLessLikeThis('user-uuid-1', 'recipe-uuid-1', mockQuery),
    ).resolves.toEqual({
      userId: 'user-uuid-1',
      sourceRecipeId: 'recipe-uuid-1',
      createdAt: '2026-11-23T00:00:00.000Z',
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('recipe_show_less'),
      ['user-uuid-1', 'recipe-uuid-1'],
    );
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 1});
    await expect(
      undoShowLess('user-uuid-1', 'recipe-uuid-1', mockQuery),
    ).resolves.toBe(true);
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    await expect(
      undoShowLess('user-uuid-1', 'recipe-uuid-1', mockQuery),
    ).resolves.toBe(false);
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          user_id: 'user-uuid-1',
          source_recipe_id: 'recipe-uuid-1',
          created_at: '2026-11-23T00:00:00.000Z',
          title: 'Soup',
        },
      ]),
    );
    await expect(
      listShowLess('user-uuid-1', 100, 0, mockQuery),
    ).resolves.toEqual([
      {
        userId: 'user-uuid-1',
        sourceRecipeId: 'recipe-uuid-1',
        createdAt: '2026-11-23T00:00:00.000Z',
        title: 'Soup',
      },
    ]);
  });

  test('discovery feed SQL applies the show-less penalty per matching source, capped', () => {
    // Penalty counts the requester's show-less sources…
    expect(DISCOVERY_FEED_SQL).toContain('recipe_show_less');
    // …at -2 per matching source…
    expect(DISCOVERY_FEED_SQL).toContain('2 * (');
    // …capped at -6 so it demotes but never buries.
    expect(DISCOVERY_FEED_SQL).toContain('least(6,');
    // Similarity = shared tag (recipe_tags join on tag_id)…
    expect(DISCOVERY_FEED_SQL).toContain('recipe_tags');
    expect(DISCOVERY_FEED_SQL).toContain('crt.tag_id = srt.tag_id');
    // …or same author.
    expect(DISCOVERY_FEED_SQL).toContain('sr.user_id = r.user_id');
    // Non-matching recipes are unaffected: the count subquery only counts
    // sources satisfying the similarity condition above.
  });

  test('discovery feed SQL does not penalise the show-less source itself', () => {
    // The source recipe is excluded from its own penalty count, and
    // show-less never adds an exclusion — only recipe_disinterest does.
    expect(DISCOVERY_FEED_SQL).toContain(
      'rsl.source_recipe_id <> r.id',
    );
    expect(DISCOVERY_FEED_SQL).not.toMatch(
      /not exists \(\s+select 1 from recipe_show_less/,
    );
  });

  test('discovery feed SQL cancels the show-less penalty on save or cook', () => {
    // An explicit save by the requester cancels the penalty…
    expect(DISCOVERY_FEED_SQL).toContain('saved_recipes sr3');
    expect(DISCOVERY_FEED_SQL).toContain(
      'sr3.user_id = $1',
    );
    // …and so does a cook (cook_logs via the cooked version's recipe).
    expect(DISCOVERY_FEED_SQL).toContain('cook_logs');
    expect(DISCOVERY_FEED_SQL).toContain('cl.user_id = $1');
    // The cancellation zeroes the penalty term.
    expect(DISCOVERY_FEED_SQL).toContain('then 0');
  });

  test('discovery feed SQL keeps hard hide winning over show-less', () => {
    // Hard hide still excludes outright, before any ranking/penalty.
    expect(DISCOVERY_FEED_SQL).toContain(
      'select 1 from recipe_disinterest rd',
    );
  });

  test('discovery feed SQL enforces visibility and hard-hide exclusion', () => {
    // Public-only, never the requester's own recipes, never ideas.
    expect(DISCOVERY_FEED_SQL).toContain("r.visibility = 'public'");
    expect(DISCOVERY_FEED_SQL).toContain("r.status <> 'idea'");
    expect(DISCOVERY_FEED_SQL).toContain('r.user_id <> $1');
    // Hard hide excludes outright.
    expect(DISCOVERY_FEED_SQL).toContain('recipe_disinterest');
    expect(DISCOVERY_FEED_SQL).toContain('not exists');
    // Soft signals and followee activity feed the ranking.
    expect(DISCOVERY_FEED_SQL).toContain('recipe_interest_signals');
    expect(DISCOVERY_FEED_SQL).toContain('user_follows');
    expect(DISCOVERY_FEED_SQL).toContain('saved_recipes');
    expect(DISCOVERY_FEED_SQL).toContain('discovery_score');
  });

  test('discovery feed query passes requester, limit, offset', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await listDiscoveryFeedRows('user-uuid-1', 50, 10, mockQuery);
    expect(mockQuery).toHaveBeenCalledWith(DISCOVERY_FEED_SQL, [
      'user-uuid-1',
      50,
      10,
    ]);
  });
});
