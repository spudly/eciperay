import {jest} from '@jest/globals';

import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

const mockMapRowToRecipeDetail = jest.fn();
const mockRecipeDetailToExportRecord = jest.fn();
const mockFetchImageAsBase64 =
  jest.fn<() => Promise<{base64: string; contentType: string} | null>>();

jest.unstable_mockModule('./mapRowToRecipeDetail.js', () => ({
  mapRowToRecipeDetail: mockMapRowToRecipeDetail,
}));

jest.unstable_mockModule('./recipeDetailToExportRecord.js', () => ({
  recipeDetailToExportRecord: mockRecipeDetailToExportRecord,
}));

jest.unstable_mockModule('./remoteImageDownload.js', () => ({
  fetchImageAsBase64: mockFetchImageAsBase64,
}));

const {buildRecipeExportRecords} =
  await import('./buildRecipeExportRecords.js');

const mockQuery = createMockQuery();

describe('buildRecipeExportRecords', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockMapRowToRecipeDetail.mockReset();
    mockRecipeDetailToExportRecord.mockReset();
    mockFetchImageAsBase64.mockReset();
  });

  test('builds export records for owned recipes', async () => {
    const detail = makeRecipeDetail({
      imageUrl: 'https://example.com/a.jpg?cache=1',
    });
    mockQuery.mockResolvedValueOnce(makeQueryResult([{id: detail.id}]));
    mockMapRowToRecipeDetail.mockReturnValue(detail);
    mockFetchImageAsBase64.mockResolvedValue({
      base64: 'abc',
      contentType: 'image/jpeg',
    });
    mockRecipeDetailToExportRecord.mockReturnValue({title: detail.title});

    const records = await buildRecipeExportRecords(
      [detail.id],
      'user-uuid-1',
      mockQuery,
    );

    expect(records).toEqual([{title: detail.title}]);
    expect(mockFetchImageAsBase64).toHaveBeenCalledWith(
      'https://example.com/a.jpg',
    );
  });

  test('skips missing recipe rows', async () => {
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const records = await buildRecipeExportRecords(
      ['missing-id'],
      'user-uuid-1',
      mockQuery,
    );

    expect(records).toEqual([]);
  });
});
