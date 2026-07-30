import request from 'supertest';

import {makeCookLogRow} from '../../test/fixtures/cookLogRow.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const CLAUDE_RESPONSE = JSON.stringify({
  title: 'Improved Pasta',
  description: 'Better pasta.',
  servings: 4,
  prepTimeMin: 10,
  cookTimeMin: 20,
  ingredients: [
    {
      sortOrder: 0,
      name: 'pasta',
      quantity: 400,
      unit: 'g',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Cook pasta'}],
});

describe('POST /recipes/:id/versions/ai', () => {
  test('returns 201 with AI-tweaked version', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeCookLogRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-2'}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(
        makeQueryResult([
          makeVersionDetailRow({
            id: 'version-uuid-2',
            version_id: 'version-uuid-2',
            version_number: 2,
            title: 'Improved Pasta',
          }),
        ]),
      );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'make this pasta creamier and easier to follow'});

    expect(res.status).toBe(201);
    expect(res.body.versionId).toBe('version-uuid-2');
    expect(res.body.version.title).toBe('Improved Pasta');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/missing-id/versions/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'make this pasta creamier and easier to follow'});

    expect(res.status).toBe(404);
  });

  test('returns 409 when recipe is perfected', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({status: 'perfected'})]),
    );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'make this pasta creamier and easier to follow'});

    expect(res.status).toBe(409);
  });

  test('returns 400 when prompt is too short', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'short'});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/ai')
      .send({prompt: 'make this pasta creamier and easier to follow'});
    expect(res.status).toBe(401);
  });

  test('returns 404 when active version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'make this pasta creamier and easier to follow'});

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Active version not found');
  });

  test('propagates unexpected AI parsing errors', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('not valid json');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    await expect(
      request(getApp())
        .post('/api/recipes/recipe-uuid-1/versions/ai')
        .set('Authorization', 'Bearer valid-token')
        .send({prompt: 'make this pasta creamier and easier to follow'}),
    ).resolves.toMatchObject({status: 502});
  });

  test('returns 500 when created version cannot be fetched', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-2'}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'make this pasta creamier and easier to follow'});

    expect(res.status).toBe(500);
  });

  test('returns 500 when version insert returns no id', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([]));

    await expect(
      request(getApp())
        .post('/api/recipes/recipe-uuid-1/versions/ai')
        .set('Authorization', 'Bearer valid-token')
        .send({prompt: 'make this pasta creamier and easier to follow'}),
    ).resolves.toMatchObject({status: 500});
  });
});
