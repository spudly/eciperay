import {jest} from '@jest/globals';
import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

// #535: acceptImport schedules the auto-image trigger from the refreshed
// detail — capture the scheduler behind a mutable factory (the app loads
// lazily in beforeAll, after these mocks are registered).
const actualAutoImageModule =
  await import('../../lib/autoGenerateRecipeImage.js');

const mockScheduleAutoGenerateRecipeImage =
  jest.fn<typeof actualAutoImageModule.scheduleAutoGenerateRecipeImage>();

jest.unstable_mockModule('../../lib/autoGenerateRecipeImage.js', () => ({
  autoGenerateRecipeImage: actualAutoImageModule.autoGenerateRecipeImage,
  autoImageContextFromDetail:
    actualAutoImageModule.autoImageContextFromDetail,
  scheduleAutoGenerateRecipeImage: (
    ...args: Parameters<
      typeof actualAutoImageModule.scheduleAutoGenerateRecipeImage
    >
  ) => mockScheduleAutoGenerateRecipeImage(...args),
}));

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('POST /recipes/:id/import/accept', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockScheduleAutoGenerateRecipeImage.mockReset();
  });

  test('accepts import and moves idea to evolving', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'idea'})]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'evolving'})]),
      );
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/import/accept')
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('evolving');
  });

  test('schedules auto-image generation from the refreshed detail after the lineage flip (#535)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'idea'})]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'evolving'})]),
      );
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/import/accept')
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(200);
    expect(mockScheduleAutoGenerateRecipeImage).toHaveBeenCalledTimes(1);
    expect(mockScheduleAutoGenerateRecipeImage).toHaveBeenCalledWith(
      {
        userId: expect.any(String),
        supabaseUid: 'user-uuid-1',
        recipe: expect.objectContaining({
          recipeId: 'recipe-uuid-1',
          imageUrl: null,
        }),
      },
      mockQuery,
    );
  });

  test('returns 404 when recipe not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post('/api/recipes/missing/import/accept')
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
  });

  test('returns 409 when recipe lifecycle is locked', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([makeRecipeDetailRow({status: 'perfected'})]),
    );
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/import/accept')
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(409);
  });

  test('returns 404 when refreshed recipe is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'evolving'})]),
      )
      .mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/import/accept')
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
  });
});
