import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const {createApp} = await import('../../server.js');

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const CLAUDE_RESPONSE = JSON.stringify({
  title: 'Weeknight Pasta',
  description: 'A quick vegetarian pasta.',
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
  instructions: [{stepNumber: 1, body: 'Cook pasta and toss with sauce'}],
});

const mockSaveFlow = () => {
  mockQuery
    .mockResolvedValueOnce(makeQueryResult([]))
    .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
    .mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({title: 'Weeknight Pasta'})]),
    );
};

describe('POST /recipes/import/ai', () => {
  test('returns 201 RecipeDetail from an AI prompt', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockSaveFlow();
    const res = await request(app)
      .post('/api/recipes/import/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({
        prompt: 'quick weeknight vegetarian pasta for 4, under 30 minutes',
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Weeknight Pasta');
  });

  test('returns 400 when prompt is too short', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/api/recipes/import/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'pasta'});
    expect(res.status).toBe(400);
    expect(res.body.issues[0]?.path).toBe('prompt');
  });

  test('returns 400 when prompt is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(app)
      .post('/api/recipes/import/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/recipes/import/ai')
      .send({prompt: 'simple chocolate chip cookies for 12'});
    expect(res.status).toBe(401);
  });

  test('returns 500 when save fails unexpectedly', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockQuery.mockReset();
    mockQuery.mockRejectedValue(new Error('db down'));
    const res = await request(app)
      .post('/api/recipes/import/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'simple chocolate chip cookies for 12'});
    expect(res.status).toBe(500);
  });
});
