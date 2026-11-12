import {jest} from '@jest/globals';
import nock from 'nock';
import type {Response} from 'express';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';

// #460 tranche 1: this canonical file is new — the former
// importHandlers.errors.test.ts and importHandlers.rethrow.test.ts
// each mocked a different module, so they are merged here behind
// per-describe mutable mock factories. Each factory delegates to a
// jest.fn whose implementation a describe installs in beforeEach;
// the default implementation (installed by the root beforeEach) is
// the real module, loaded before the mocks are registered.
const actualRecipeImportModule =
  await import('../../lib/recipeImportToInput.js');
const actualSaveRecipeModule = await import('../../lib/saveRecipeFromInput.js');

const {RecipeImportError} = actualRecipeImportModule;

const mockRecipeImportToInput =
  jest.fn<typeof actualRecipeImportModule.recipeImportToInput>();
const mockSaveRecipeFromInput =
  jest.fn<typeof actualSaveRecipeModule.saveRecipeFromInput>();
const mockSaveNewRecipeFromInput =
  jest.fn<typeof actualSaveRecipeModule.saveNewRecipeFromInput>();

jest.unstable_mockModule('../../lib/recipeImportToInput.js', () => ({
  RecipeImportError,
  recipeImportToInput: (
    ...args: Parameters<typeof actualRecipeImportModule.recipeImportToInput>
  ) => mockRecipeImportToInput(...args),
}));

jest.unstable_mockModule('../../lib/saveRecipeFromInput.js', () => ({
  saveRecipeFromInput: (
    ...args: Parameters<typeof actualSaveRecipeModule.saveRecipeFromInput>
  ) => mockSaveRecipeFromInput(...args),
  saveNewRecipeFromInput: (
    ...args: Parameters<typeof actualSaveRecipeModule.saveNewRecipeFromInput>
  ) => mockSaveNewRecipeFromInput(...args),
  RecipeNotFoundError: actualSaveRecipeModule.RecipeNotFoundError,
}));

const {importFromImage} = await import('./importFromImage.js');
const {importFromText} = await import('./importFromText.js');
const {importFromUrl} = await import('./importFromUrl.js');

const mockQuery = createMockQuery();

// Default: every mocked module behaves as the real implementation.
// The describes below override only the factories they exercise.
beforeEach(() => {
  mockRecipeImportToInput.mockImplementation(
    actualRecipeImportModule.recipeImportToInput,
  );
  mockSaveRecipeFromInput.mockImplementation(
    actualSaveRecipeModule.saveRecipeFromInput,
  );
  mockSaveNewRecipeFromInput.mockImplementation(
    actualSaveRecipeModule.saveNewRecipeFromInput,
  );
});

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

// Former importHandlers.errors.test.ts.
describe('import handlers RecipeImportError handling', () => {
  beforeEach(() => {
    mockRecipeImportToInput.mockImplementation(() => {
      throw new RecipeImportError('servings is required');
    });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    // Handlers are called directly, bypassing the entitlement middleware.
    // importFromUrl checks the recipe cap first; the others start with
    // consumeAiCall's INSERT, which must return a row.
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('count(*) as count from recipes')) {
        return Promise.resolve(makeQueryResult([{count: '0'}]));
      }
      if (sql.includes('insert into ai_usage')) {
        return Promise.resolve(
          makeQueryResult([
            {calls: 1, period_start: '2026-10-01', allowed: true},
          ]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
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
        entitlement: {
          plan: 'free',
          status: null,
          aiUsed: 0,
          aiLimit: 5,
          periodEndsAt: null,
          paddleCustomerId: null,
          cancelAtPeriodEnd: false,
        },
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
          cancelAtPeriodEnd: false,
        },
      } as never,
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
      {
        userId: 'user-uuid-1',
        body: {text: 'Pasta recipe'},
        entitlement: {
          plan: 'free',
          status: null,
          aiUsed: 0,
          aiLimit: 5,
          periodEndsAt: null,
          paddleCustomerId: null,
          cancelAtPeriodEnd: false,
        },
      } as never,
      res,
      mockQuery,
    );
    expect(res.statusCode).toBe(422);
    expect(res.json).toHaveBeenCalledWith({error: 'servings is required'});
  });
});

// Former importHandlers.rethrow.test.ts.
describe('import handlers unexpected errors', () => {
  beforeEach(() => {
    mockSaveNewRecipeFromInput.mockImplementation(async () => {
      throw new Error('save failed');
    });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    // Handlers are called directly, bypassing the entitlement middleware.
    // importFromUrl checks the recipe cap first; the others start with
    // consumeAiCall's INSERT, which must return a row.
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('count(*) as count from recipes')) {
        return Promise.resolve(makeQueryResult([{count: '0'}]));
      }
      if (sql.includes('insert into ai_usage')) {
        return Promise.resolve(
          makeQueryResult([
            {calls: 1, period_start: '2026-10-01', allowed: true},
          ]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
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
            cancelAtPeriodEnd: false,
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
            cancelAtPeriodEnd: false,
          },
        } as never,
        res,
        mockQuery,
      ),
    ).rejects.toThrow('save failed');
  });
});
