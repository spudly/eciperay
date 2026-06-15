import request from 'supertest';

import {createApp} from '../../server.js';
import {makeIngredientInput} from '../../test/fixtures/ingredient.js';
import {makeInstructionInput} from '../../test/fixtures/instruction.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const RECIPE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('POST /recipes/export', () => {
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
