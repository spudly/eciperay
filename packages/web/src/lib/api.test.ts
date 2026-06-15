import {recipoo} from './api.js';
import {supabase} from './supabase.js';

describe('api', () => {
  test('recipoo client fetches recipes', async () => {
    const recipes = await recipoo.recipes.list();
    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.title).toBe('Test Recipe');
  });

  test('generates a recipe image via the API', async () => {
    const image = await recipoo.ai.generateImage({
      title: 'Soup',
      description: 'Warm soup',
      ingredients: [{name: 'broth', quantity: 4, unit: 'cups'}],
      instructions: ['Simmer broth'],
    });
    expect(image).toEqual({imageBase64: 'aGVsbG8=', contentType: 'image/png'});
  });

  test('generates a recipe description via the API', async () => {
    const result = await recipoo.ai.generateDescription({
      title: 'Soup',
      ingredients: ['broth'],
      instructions: ['Simmer broth'],
    });
    expect(result).toEqual({
      description: 'A delicious AI-generated description.',
    });
  });

  test('getToken returns null without session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {session: null},
      error: null,
    });
    await recipoo.recipes.list();
    expect(supabase.auth.getSession).toHaveBeenCalled();
  });
});
