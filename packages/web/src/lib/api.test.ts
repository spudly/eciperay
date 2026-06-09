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
      ingredients: ['broth'],
    });
    expect(image).toEqual({imageBase64: 'aGVsbG8=', contentType: 'image/png'});
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
