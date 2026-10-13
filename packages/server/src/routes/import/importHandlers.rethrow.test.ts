import {jest} from '@jest/globals';
import nock from 'nock';
import type {Response} from 'express';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';

const mockQuery = createMockQuery();

jest.unstable_mockModule('../../lib/saveRecipeFromInput.js', () => ({
  saveNewRecipeFromInput: async () => {
    throw new Error('save failed');
  },
}));

const {importFromImage} = await import('./importFromImage.js');
const {importFromUrl} = await import('./importFromUrl.js');

const RECIPE_JSON = JSON.stringify({
  title: 'Soup',
  description: 'A hearty soup.',
  servings: 4,
  prepTimeMin: null,
  cookTimeMin: null,
  sourceUrl: null,
  ingredients: [
    {
      sortOrder: 0,
      name: 'broth',
      quantity: 1,
      unit: 'L',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Simmer'}],
});

const makeRes = () => {
  const res = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json: jest.fn(),
  };
  return res as unknown as Response & {statusCode: number; json: jest.Mock};
};

describe('import handlers unexpected errors', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    // First query is consumeAiCall's INSERT (handlers are called directly,
    // bypassing the entitlement middleware); it must return a row.
    mockQuery.mockResolvedValueOnce(makeQueryResult([{calls: 1}]));
    mockQuery.mockResolvedValue(makeQueryResult([]));
  });

  test('importFromUrl rethrows when save fails', async () => {
    nock('https://recipe.example.com')
      .get('/plain')
      .reply(200, '<html><body>Recipe text</body></html>');
    nockAnthropicMessage(RECIPE_JSON);
    const res = makeRes();
    await expect(
      importFromUrl(
        {
          userId: 'user-uuid-1',
          body: {url: 'https://recipe.example.com/plain'},
          entitlement: {
            plan: 'free',
            status: null,
            aiUsed: 0,
            aiLimit: 5,
            periodEndsAt: null,
            paddleCustomerId: null,
          },
        } as never,
        res,
        mockQuery,
      ),
    ).rejects.toThrow('save failed');
  });

  test('importFromImage rethrows when save fails', async () => {
    nockAnthropicMessage(RECIPE_JSON);
    const res = makeRes();
    await expect(
      importFromImage(
        {
          userId: 'user-uuid-1',
          body: {imageBase64: 'abc'},
          entitlement: {
            plan: 'free',
            status: null,
            aiUsed: 0,
            aiLimit: 5,
            periodEndsAt: null,
            paddleCustomerId: null,
          },
        } as never,
        res,
        mockQuery,
      ),
    ).rejects.toThrow('save failed');
  });
});
