import {jest} from '@jest/globals';
import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const resolveImportedImageUrl = jest.fn<() => Promise<string | null>>();

jest.unstable_mockModule('../../lib/uploadRecipeImageServer.js', () => ({
  uploadRecipeImageBuffer: jest.fn(),
  resolveImportedImageUrl,
  fetchImageAsBase64: jest.fn(),
}));

const {createApp} = await import('../../server.js');

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const CLAUDE_RESPONSE = JSON.stringify({
  title: 'Pasted Pasta',
  description: 'A quick pasta dish.',
  servings: 4,
  prepTimeMin: null,
  cookTimeMin: null,
  sourceUrl: null,
  ingredients: [
    {
      sortOrder: 0,
      name: 'pasta',
      quantity: 200,
      unit: 'g',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Boil pasta'}],
});

const mockSaveFlow = () => {
  mockQuery
    .mockResolvedValueOnce(makeQueryResult([]))
    .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
    .mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({title: 'Pasted Pasta'})]),
    );
};

describe('POST /recipes/import/text', () => {
  test('returns 201 RecipeDetail from plain text via Claude', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockSaveFlow();
    const res = await request(app)
      .post('/recipes/import/text')
      .set('Authorization', 'Bearer valid-token')
      .send({text: 'Pasta\n\nIngredients:\n200g pasta\n\nBoil pasta.'});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Pasted Pasta');
  });

  test('stores imported images in the bucket instead of external URLs', async () => {
    const bucketUrl =
      'https://storage.supabase.co/object/public/recipe-images/user-uuid-1/recipe-uuid-1';
    resolveImportedImageUrl.mockResolvedValueOnce(bucketUrl);
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(
        makeQueryResult([
          makeRecipeDetailRow({title: 'Pasted Pasta', image_url: bucketUrl}),
        ]),
      );
    const res = await request(app)
      .post('/recipes/import/text')
      .set('Authorization', 'Bearer valid-token')
      .send({
        text: '<h1>Pasta</h1><img src="https://example.com/photo.jpg" /><p>Boil pasta.</p>',
      });
    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toBe(bucketUrl);
    expect(resolveImportedImageUrl).toHaveBeenCalledWith(
      'https://example.com/photo.jpg',
      'user-uuid-1',
      'recipe-uuid-1',
    );
  });

  test('strips HTML before sending to Claude', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockSaveFlow();
    const res = await request(app)
      .post('/recipes/import/text')
      .set('Authorization', 'Bearer valid-token')
      .send({
        text: '<h1>Pasta</h1><p>Ingredients: 200g pasta</p><p>Boil pasta.</p>',
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Pasted Pasta');
  });

  test('returns 400 when text is empty', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/recipes/import/text')
      .set('Authorization', 'Bearer valid-token')
      .send({text: ''});
    expect(res.status).toBe(400);
  });

  test('accepts bloated HTML when stripped text is within limits', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockSaveFlow();
    const res = await request(app)
      .post('/recipes/import/text')
      .set('Authorization', 'Bearer valid-token')
      .send({text: `<div>${'<span>Pasta</span>'.repeat(20_000)}</div>`});
    expect(res.status).toBe(201);
  });

  test('returns 400 when HTML contains no recipe text', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/recipes/import/text')
      .set('Authorization', 'Bearer valid-token')
      .send({text: '<div><img src="https://example.com/photo.jpg" /></div>'});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'No recipe text found after removing formatting',
    );
  });

  test('accepts pasted HTML with a large embedded base64 image', async () => {
    const bucketUrl =
      'https://storage.supabase.co/object/public/recipe-images/user-uuid-1/recipe-uuid-1';
    const dataUrl = `data:image/png;base64,${'A'.repeat(469_000)}`;
    resolveImportedImageUrl.mockResolvedValueOnce(bucketUrl);
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(
        makeQueryResult([
          makeRecipeDetailRow({title: 'Pasted Pasta', image_url: bucketUrl}),
        ]),
      );
    const res = await request(app)
      .post('/recipes/import/text')
      .set('Authorization', 'Bearer valid-token')
      .send({text: `<h1>Pasta</h1><img src="${dataUrl}" /><p>Boil pasta.</p>`});
    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toBe(bucketUrl);
    expect(resolveImportedImageUrl).toHaveBeenCalledWith(
      dataUrl,
      'user-uuid-1',
      'recipe-uuid-1',
    );
  });

  test('returns 400 when stripped text exceeds the plain-text limit', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/recipes/import/text')
      .set('Authorization', 'Bearer valid-token')
      .send({text: 'a'.repeat(100_001)});
    expect(res.status).toBe(400);
    expect(res.body.issues[0]?.path).toBe('text');
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/recipes/import/text')
      .send({text: 'Some recipe'});
    expect(res.status).toBe(401);
  });

  test('returns 500 when save fails unexpectedly', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockQuery.mockReset();
    mockQuery.mockRejectedValue(new Error('db down'));
    const res = await request(app)
      .post('/recipes/import/text')
      .set('Authorization', 'Bearer valid-token')
      .send({text: 'Pasta recipe'});
    expect(res.status).toBe(500);
  });
});
