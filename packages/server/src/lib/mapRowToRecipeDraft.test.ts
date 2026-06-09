import {makeRecipeDraft} from '../test/fixtures/recipeDraft.js';
import {makeRecipeDraftRow} from '../test/fixtures/recipeDraftRow.js';

import {mapRowToRecipeDraft} from './mapRowToRecipeDraft.js';

describe('mapRowToRecipeDraft', () => {
  test('maps snake_case draft row to camelCase RecipeDraft', () => {
    expect(mapRowToRecipeDraft(makeRecipeDraftRow())).toEqual(
      makeRecipeDraft(),
    );
  });
});
