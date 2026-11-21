import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {createMockQuery} from '../test/mockQuery.js';

import {loadPublicDiscover} from './loadPublicDiscover.js';

const mockQuery = createMockQuery();

describe('loadPublicDiscover', () => {
  test('loads the public feed first page and maps rows to discovery items', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeRecipeDetailRow({
          visibility: 'public',
          slug: 'pasta',
          user_id: 'owner-uuid',
          author_display_name: 'Ada Cook',
        }),
      ]),
    );

    const items = await loadPublicDiscover(mockQuery);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'recipe-uuid-1',
      slug: 'pasta',
      title: 'Test Recipe',
      visibility: 'public',
      authorDisplayName: 'Ada Cook',
    });
    // First page only: the client's page size (20) at offset 0.
    const [, values] = mockQuery.mock.calls[0] as unknown as [
      string,
      unknown[],
    ];
    expect(values[0]).toBe(20);
    expect(values[1]).toBe(0);
  });

  test('returns an empty feed when there are no public recipes', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));

    await expect(loadPublicDiscover(mockQuery)).resolves.toEqual([]);
  });
});
