import request from 'supertest';

import {createApp} from '../../server.js';
import {makeIngredientInput} from '../../test/fixtures/ingredient.js';
import {makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});
const TAG_ID = '11111111-1111-4111-8111-111111111111';

const mockCreateFlow = () => {
  mockQuery
    .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
    .mockResolvedValue(makeQueryResult([makeRecipeDetailRow()]));
};

describe('POST /recipes', () => {
  test('returns 201 with recipe detail after creation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockCreateFlow();

    const res = await request(app)
      .post('/recipes')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Recipe');
    expect(res.body.userId).toBe('user-uuid-1');
  });

  test('creates recipe with null optional fields (covers ?? null branches)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockCreateFlow();

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
    mockCreateFlow();

    const res = await request(app)
      .post('/recipes')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput({tagIds: [TAG_ID]}));

    expect(res.status).toBe(201);
  });

  test('returns 400 when body is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/recipes')
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).post('/recipes').send(makeRecipeInput());
    expect(res.status).toBe(401);
  });
});
