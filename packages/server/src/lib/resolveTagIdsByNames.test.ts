import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {resolveTagIdsByNames} from './resolveTagIdsByNames.js';

const PRESET_TAG_ID = '11111111-1111-4111-8111-111111111111';
const NEW_TAG_ID = '22222222-2222-4222-8222-222222222222';

describe('resolveTagIdsByNames', () => {
  test('matches existing tags case-insensitively', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {id: PRESET_TAG_ID, name: 'Dinner', color: '#6366f1', is_preset: true},
      ]),
    );

    const tagIds = await resolveTagIdsByNames(
      'user-uuid-1',
      [{name: 'dinner'}],
      mockQuery,
    );

    expect(tagIds).toEqual([PRESET_TAG_ID]);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('creates custom tags when no match exists', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{id: NEW_TAG_ID}]));

    const tagIds = await resolveTagIdsByNames(
      'user-uuid-1',
      [{name: 'Weeknight', color: '#ff0000'}],
      mockQuery,
    );

    expect(tagIds).toEqual([NEW_TAG_ID]);
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('insert into tags'),
      ['user-uuid-1', 'Weeknight', '#ff0000'],
    );
  });
});
