import type {Response} from 'express';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';

import {updateRecipe} from './updateRecipe.js';

const mockQuery = createMockQuery();

const makeRes = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as Response & {statusCode: number; body: unknown};
};

const makeReq = (body: Record<string, unknown> = {}) =>
  ({
    userId: 'user-uuid-1',
    params: {id: 'recipe-uuid-1'},
    body,
  }) as unknown as AuthedRequest;

describe('updateRecipe', () => {
  test('updates active version image and returns recipe detail', async () => {
    const res = makeRes();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-1'}]))
      .mockResolvedValue(
        makeQueryResult([
          makeRecipeDetailRow({
            imageUrl: 'https://example.com/new.jpg',
            image_url: 'https://example.com/new.jpg',
          }),
        ]),
      );

    await updateRecipe(
      makeReq({imageUrl: 'https://example.com/new.jpg'}),
      res,
      mockQuery,
    );

    expect(res.statusCode).toBe(200);
    expect((res.body as ReturnType<typeof makeRecipeDetail>).imageUrl).toBe(
      'https://example.com/new.jpg',
    );
  });

  test('returns 400 when imageUrl is missing', async () => {
    const res = makeRes();
    await updateRecipe(makeReq({title: 'Ignored'}), res, mockQuery);
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 when validation fails', async () => {
    const res = makeRes();
    await updateRecipe(makeReq({imageUrl: 'not-a-url'}), res, mockQuery);
    expect(res.statusCode).toBe(400);
  });

  test('returns 404 when recipe is not found', async () => {
    const res = makeRes();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await updateRecipe(
      makeReq({imageUrl: 'https://example.com/new.jpg'}),
      res,
      mockQuery,
    );
    expect(res.statusCode).toBe(404);
  });

  test('returns 404 when refreshed recipe is missing', async () => {
    const res = makeRes();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([]));
    await updateRecipe(
      makeReq({imageUrl: 'https://example.com/new.jpg'}),
      res,
      mockQuery,
    );
    expect(res.statusCode).toBe(404);
  });
});
