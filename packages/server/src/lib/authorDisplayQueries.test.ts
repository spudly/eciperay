import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  emptyAuthorDisplaySettings,
  fetchAuthorDisplaySettings,
  mapRowToAuthorDisplaySettings,
  updateAuthorDisplaySettings,
} from './authorDisplayQueries.js';

describe('authorDisplayQueries', () => {
  test('maps a row to settings', () => {
    expect(
      mapRowToAuthorDisplaySettings({
        display_name: 'Chef Alex',
        show_author_on_public_recipes: false,
      }),
    ).toEqual({displayName: 'Chef Alex', showOnPublicRecipes: false});
  });

  test('defaults show the name when no settings exist yet', () => {
    expect(emptyAuthorDisplaySettings()).toEqual({
      displayName: null,
      showOnPublicRecipes: true,
    });
  });

  test('fetch returns defaults when the user row is missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    await expect(
      fetchAuthorDisplaySettings('user-uuid-1', mockQuery),
    ).resolves.toEqual({displayName: null, showOnPublicRecipes: true});
  });

  test('update trims the display name and maps blank to null', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {display_name: null, show_author_on_public_recipes: false},
      ]),
    );
    await expect(
      updateAuthorDisplaySettings(
        'user-uuid-1',
        {displayName: '   ', showOnPublicRecipes: false},
        mockQuery,
      ),
    ).resolves.toEqual({displayName: null, showOnPublicRecipes: false});
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      null,
      false,
    ]);
  });

  test('update returns null when the user row is missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    await expect(
      updateAuthorDisplaySettings(
        'user-uuid-1',
        {displayName: 'Chef Alex', showOnPublicRecipes: true},
        mockQuery,
      ),
    ).resolves.toBeNull();
  });
});
