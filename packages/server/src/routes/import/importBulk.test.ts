import {jest} from '@jest/globals';
import request from 'supertest';

import {makeIngredientInput} from '../../test/fixtures/ingredient.js';
import {makeInstructionInput} from '../../test/fixtures/instruction.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const fetchImageAsBase64 =
  jest.fn<() => Promise<{base64: string; contentType: string} | null>>();
const resolveImportedImageUrl = jest.fn<() => Promise<string | null>>();

jest.unstable_mockModule('../../lib/remoteImageDownload.js', () => ({
  downloadRemoteImage: jest.fn(),
  fetchImageAsBase64,
}));

jest.unstable_mockModule('../../lib/uploadRecipeImageServer.js', () => ({
  uploadRecipeImageBuffer: jest.fn(),
  fetchImageAsBase64,
  resolveImportedImageUrl,
}));

const {createApp} = await import('../../server.js');

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const RECIPE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const exportRecord = {
  title: 'Imported Recipe',
  description: 'From export',
  servings: 2,
  prepTimeMin: 10,
  cookTimeMin: 20,
  starRating: null,
  sourceUrl: null,
  tags: [{name: 'Dinner'}],
  ingredients: [makeIngredientInput()],
  instructions: [makeInstructionInput()],
};

describe('POST /recipes/export', () => {
  beforeEach(() => {
    fetchImageAsBase64.mockReset();
  });

  test('returns export bundle for selected recipes', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: RECIPE_ID}]))
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({id: RECIPE_ID})]),
      );

    const res = await request(app)
      .post('/recipes/export')
      .set('Authorization', 'Bearer valid-token')
      .send({recipeIds: [RECIPE_ID]});

    expect(res.status).toBe(200);
    expect(res.body.formatVersion).toBe(1);
    expect(res.body.recipes).toHaveLength(1);
    expect(res.body.recipes[0].title).toBe('Test Recipe');
    expect(res.body.recipes[0].tags[0].name).toBeDefined();
  });

  test('embeds recipe images when available', async () => {
    nockSupabaseGetUser('user-uuid-1');
    fetchImageAsBase64.mockResolvedValue({
      base64: 'abc',
      contentType: 'image/jpeg',
    });
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: RECIPE_ID}]))
      .mockResolvedValueOnce(
        makeQueryResult([
          makeRecipeDetailRow({
            id: RECIPE_ID,
            image_url: 'https://example.com/photo.jpg?v=1',
          }),
        ]),
      );

    const res = await request(app)
      .post('/recipes/export')
      .set('Authorization', 'Bearer valid-token')
      .send({recipeIds: [RECIPE_ID]});

    expect(res.status).toBe(200);
    expect(fetchImageAsBase64).toHaveBeenCalledWith(
      'https://example.com/photo.jpg',
    );
    expect(res.body.recipes[0].image).toEqual({
      base64: 'abc',
      contentType: 'image/jpeg',
    });
  });

  test('omits image data when download fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    fetchImageAsBase64.mockResolvedValue(null);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: RECIPE_ID}]))
      .mockResolvedValueOnce(
        makeQueryResult([
          makeRecipeDetailRow({
            id: RECIPE_ID,
            image_url: 'https://example.com/photo.jpg',
          }),
        ]),
      );

    const res = await request(app)
      .post('/recipes/export')
      .set('Authorization', 'Bearer valid-token')
      .send({recipeIds: [RECIPE_ID]});

    expect(res.status).toBe(200);
    expect(res.body.recipes[0].image).toBeUndefined();
  });

  test('skips recipes that cannot be loaded', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: RECIPE_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(app)
      .post('/recipes/export')
      .set('Authorization', 'Bearer valid-token')
      .send({recipeIds: [RECIPE_ID]});

    expect(res.status).toBe(200);
    expect(res.body.recipes).toEqual([]);
  });

  test('returns 400 when recipeIds is empty', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/recipes/export')
      .set('Authorization', 'Bearer valid-token')
      .send({recipeIds: []});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/recipes/export')
      .send({recipeIds: [RECIPE_ID]});
    expect(res.status).toBe(401);
  });
});

describe('POST /recipes/import/bulk', () => {
  beforeEach(() => {
    resolveImportedImageUrl.mockReset();
  });

  test('imports recipes and returns created summary', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {id: 'tag-uuid-1', name: 'Dinner', color: '#6366f1', is_preset: true},
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));

    const res = await request(app)
      .post('/recipes/import/bulk')
      .set('Authorization', 'Bearer valid-token')
      .send({formatVersion: 1, recipes: [exportRecord]});

    expect(res.status).toBe(201);
    expect(res.body.created).toHaveLength(1);
    expect(res.body.created[0].title).toBe('Test Recipe');
    expect(res.body.errors).toEqual([]);
  });

  test('imports recipe images when provided', async () => {
    nockSupabaseGetUser('user-uuid-1');
    resolveImportedImageUrl.mockResolvedValue('https://cdn.example/photo.jpg');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {id: 'tag-uuid-1', name: 'Dinner', color: '#6366f1', is_preset: true},
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));

    const res = await request(app)
      .post('/recipes/import/bulk')
      .set('Authorization', 'Bearer valid-token')
      .send({
        recipes: [
          {...exportRecord, image: {base64: 'abc', contentType: 'image/jpeg'}},
        ],
      });

    expect(res.status).toBe(201);
    expect(resolveImportedImageUrl).toHaveBeenCalled();
    expect(res.body.created).toHaveLength(1);
  });

  test('records per-recipe errors without failing the batch', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {id: 'tag-uuid-1', name: 'Dinner', color: '#6366f1', is_preset: true},
        ]),
      )
      .mockRejectedValueOnce(new Error('save failed'));

    const res = await request(app)
      .post('/recipes/import/bulk')
      .set('Authorization', 'Bearer valid-token')
      .send({recipes: [exportRecord]});

    expect(res.status).toBe(201);
    expect(res.body.created).toEqual([]);
    expect(res.body.errors).toEqual([
      {index: 0, title: exportRecord.title, message: 'save failed'},
    ]);
  });

  test('records generic message for non-error throws', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockRejectedValueOnce('save failed');

    const res = await request(app)
      .post('/recipes/import/bulk')
      .set('Authorization', 'Bearer valid-token')
      .send({recipes: [exportRecord]});

    expect(res.status).toBe(201);
    expect(res.body.errors).toEqual([
      {index: 0, title: exportRecord.title, message: 'Import failed'},
    ]);
  });

  test('returns 400 when recipes array is empty', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/recipes/import/bulk')
      .set('Authorization', 'Bearer valid-token')
      .send({recipes: []});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/recipes/import/bulk')
      .send({recipes: [exportRecord]});
    expect(res.status).toBe(401);
  });
});

describe('refreshRecipeDetail', () => {
  test('returns null when recipe detail is missing', async () => {
    const {refreshRecipeDetail} = await import('./importBulk.js');
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    await expect(
      refreshRecipeDetail('recipe-uuid-1', 'user-uuid-1', mockQuery),
    ).resolves.toBeNull();
  });

  test('returns mapped recipe detail when row exists', async () => {
    const {refreshRecipeDetail} = await import('./importBulk.js');
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]));

    await expect(
      refreshRecipeDetail('recipe-uuid-1', 'user-uuid-1', mockQuery),
    ).resolves.toMatchObject({title: 'Test Recipe'});
  });
});
