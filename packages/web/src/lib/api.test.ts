import {AuthError} from '@supabase/supabase-js';

import {eciperay} from './api.js';
import {supabase} from './supabase.js';

describe('api', () => {
  test('eciperay client fetches recipes', async () => {
    const recipes = await eciperay.recipes.list();
    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.title).toBe('Test Recipe');
  });

  test('generates a recipe image via the API', async () => {
    const image = await eciperay.ai.generateImage({
      title: 'Soup',
      description: 'Warm soup',
      ingredients: [{name: 'broth', quantity: 4, unit: 'cups'}],
      instructions: ['Simmer broth'],
    });
    expect(image).toEqual({imageBase64: 'aGVsbG8=', contentType: 'image/png'});
  });

  test('generates a recipe description via the API', async () => {
    const result = await eciperay.ai.generateDescription({
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
    await eciperay.recipes.list();
    expect(supabase.auth.getSession).toHaveBeenCalled();
  });

  test('propagates a getSession error instead of sending the request without a token', async () => {
    const refreshFailure = new AuthError('refresh failed', 500);
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {session: null},
      error: refreshFailure,
    });
    await expect(eciperay.auth.syncUser()).rejects.toBe(refreshFailure);
  });
});
