import {makeCookLogRow} from '../../test/fixtures/cookLogRow.js';

import {mapRowToCookLog} from './mapRowToCookLog.js';

describe('mapRowToCookLog', () => {
  test('maps database row to CookLog', () => {
    expect(mapRowToCookLog(makeCookLogRow())).toEqual({
      id: 'cook-log-uuid-1',
      recipeVersionId: 'version-uuid-1',
      userId: 'user-uuid-1',
      cookedAt: '2024-01-02T00:00:00.000Z',
      authorStarRating: 4,
      notes: 'Turned out great',
      createdAt: '2024-01-02T00:00:00.000Z',
    });
  });
});
