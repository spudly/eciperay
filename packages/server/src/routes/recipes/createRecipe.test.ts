import request from 'supertest';

import {createApp} from '../../server.js';
import {makeIngredientInput} from '../../test/fixtures/ingredient.js';
import {makeRecipeDetail, makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('POST /recipes', () => {
  test('returns 201 with recipe detail after creation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const detail = makeRecipeDetail();
    // First call: insertRecipe returning {id}
    // Middle calls: insertIngredients, insertInstructions, linkTags
    // Last call: GET_RECIPE_DETAIL_SQL returning full detail
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([detail]));

    const res = await request(app)
      .post('/recipes')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Recipe');
  });

  test('creates recipe with null optional fields (covers ?? null branches)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const detail = makeRecipeDetail();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([detail]));

    const res = await request(app)
      .post('/recipes')
      .set('Authorization', 'Bearer valid-token')
      .send(
        makeRecipeInput({
          description: null,
          prepTimeMin: null,
          cookTimeMin: null,
          ingredients: [
            makeIngredientInput({quantity: null, unit: null, notes: null}),
          ],
        }),
      );

    expect(res.status).toBe(201);
  });

  test('creates recipe with tags (covers linkTag)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const detail = makeRecipeDetail();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValue(makeQueryResult([detail]));

    const res = await request(app)
      .post('/recipes')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput({tagIds: ['tag-uuid-1']}));

    expect(res.status).toBe(201);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).post('/recipes').send(makeRecipeInput());
    expect(res.status).toBe(401);
  });
});
