import {jest} from '@jest/globals';
import nock from 'nock';
import type {Response} from 'express';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';

const mockQuery = createMockQuery();

class RecipeImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecipeImportError';
  }
}

jest.unstable_mockModule('../../lib/recipeImportToInput.js', () => ({
  RecipeImportError,
  recipeImportToInput: () => {
    throw new RecipeImportError('servings is required');
  },
}));

const {importFromAi} = await import('./importFromAi.js');
const {importFromImage} = await import('./importFromImage.js');
const {importFromText} = await import('./importFromText.js');
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

describe('import handlers RecipeImportError handling', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue(makeQueryResult([]));
  });

  test('importFromUrl returns 422 when recipe import is invalid', async () => {
    nock('https://recipe.example.com')
      .get('/plain')
      .reply(200, '<html><body>Recipe text</body></html>');
    nockAnthropicMessage(RECIPE_JSON);
    const res = makeRes();
    await importFromUrl(
      {
        userId: 'user-uuid-1',
        body: {url: 'https://recipe.example.com/plain'},
      } as never,
      res,
      mockQuery,
    );
    expect(res.statusCode).toBe(422);
    expect(res.json).toHaveBeenCalledWith({error: 'servings is required'});
  });

  test('importFromImage returns 422 when recipe import is invalid', async () => {
    nockAnthropicMessage(RECIPE_JSON);
    const res = makeRes();
    await importFromImage(
      {userId: 'user-uuid-1', body: {imageBase64: 'abc'}} as never,
      res,
      mockQuery,
    );
    expect(res.statusCode).toBe(422);
    expect(res.json).toHaveBeenCalledWith({error: 'servings is required'});
  });

  test('importFromText returns 422 when recipe import is invalid', async () => {
    nockAnthropicMessage(RECIPE_JSON);
    const res = makeRes();
    await importFromText(
      {userId: 'user-uuid-1', body: {text: 'Pasta recipe'}} as never,
      res,
      mockQuery,
    );
    expect(res.statusCode).toBe(422);
    expect(res.json).toHaveBeenCalledWith({error: 'servings is required'});
  });

  test('importFromAi returns 422 when recipe import is invalid', async () => {
    nockAnthropicMessage(RECIPE_JSON);
    const res = makeRes();
    await importFromAi(
      {
        userId: 'user-uuid-1',
        body: {prompt: 'simple chocolate chip cookies for 12'},
      } as never,
      res,
      mockQuery,
    );
    expect(res.statusCode).toBe(422);
    expect(res.json).toHaveBeenCalledWith({error: 'servings is required'});
  });
});
