import {jest} from '@jest/globals';
import type {Response} from 'express';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {
  DUPLICATE_RECIPE_ERROR_CODE,
  duplicateRecipeMessage,
  respondIfDuplicateImport,
} from './respondIfDuplicateImport.js';

const input = {
  title: 'Pasted Pasta',
  ingredients: [
    {
      name: 'pasta',
      quantity: 200,
      unit: 'g',
      notes: null,
      isOptional: false,
    },
  ],
};

const candidateRow = {
  id: 'recipe-uuid-9',
  title: 'Pasted Pasta',
  ingredients: [
    {name: 'pasta', quantity: 200, unit: 'g', notes: null, isOptional: false},
  ],
};

const makeRes = () => {
  const res = {
    status: jest.fn<(code: number) => unknown>(),
    json: jest.fn<(body: unknown) => unknown>(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

describe('respondIfDuplicateImport', () => {
  test('responds 409 with the duplicate warning and returns true', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([candidateRow]));
    const res = makeRes();

    const handled = await respondIfDuplicateImport(
      res as unknown as Response,
      {userId: 'user-uuid-1', input, queryFn: mockQuery},
    );

    expect(handled).toBe(true);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: DUPLICATE_RECIPE_ERROR_CODE,
      message: duplicateRecipeMessage({
        recipeId: 'recipe-uuid-9',
        title: 'Pasted Pasta',
      }),
      duplicate: {recipeId: 'recipe-uuid-9', title: 'Pasted Pasta'},
    });
  });

  test('returns false without responding when there is no duplicate', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = makeRes();

    const handled = await respondIfDuplicateImport(
      res as unknown as Response,
      {userId: 'user-uuid-1', input, queryFn: mockQuery},
    );

    expect(handled).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('skips the lookup entirely when allowDuplicate is set', async () => {
    const mockQuery = createMockQuery();
    const res = makeRes();

    const handled = await respondIfDuplicateImport(
      res as unknown as Response,
      {
        userId: 'user-uuid-1',
        input,
        allowDuplicate: true,
        queryFn: mockQuery,
      },
    );

    expect(handled).toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
