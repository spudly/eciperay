import type {SupabaseClient} from '@supabase/supabase-js';

import {
  RECIPE_IMAGES_BUCKET,
  recipeImageStoragePath,
  uploadRecipeImage,
} from './uploadRecipeImage.js';

const makeSupabase = () => {
  const upload = jest.fn().mockResolvedValue({error: null});
  const getPublicUrl = jest
    .fn()
    .mockReturnValue({data: {publicUrl: 'https://cdn.example/recipe.png'}});
  const from = jest.fn().mockReturnValue({upload, getPublicUrl});
  return {
    client: {storage: {from}} as unknown as SupabaseClient,
    from,
    upload,
    getPublicUrl,
  };
};

describe('recipeImageStoragePath', () => {
  test('uses the supabase user id and recipe id', () => {
    expect(recipeImageStoragePath('user-uuid-1', 'recipe-uuid-1')).toBe(
      'user-uuid-1/recipe-uuid-1',
    );
  });
});

describe('uploadRecipeImage', () => {
  test('uploads to the recipe path and returns the public URL', async () => {
    const {client, from, upload, getPublicUrl} = makeSupabase();
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});

    await expect(
      uploadRecipeImage(client, file, 'user-uuid-1', 'recipe-uuid-1'),
    ).resolves.toBe('https://cdn.example/recipe.png');

    expect(from).toHaveBeenCalledWith(RECIPE_IMAGES_BUCKET);
    expect(upload).toHaveBeenCalledWith('user-uuid-1/recipe-uuid-1', file, {
      contentType: 'image/png',
      upsert: true,
    });
    expect(getPublicUrl).toHaveBeenCalledWith('user-uuid-1/recipe-uuid-1');
  });

  test('throws when storage upload fails', async () => {
    const {client, upload} = makeSupabase();
    upload.mockResolvedValue({error: new Error('upload failed')});
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await expect(
      uploadRecipeImage(client, file, 'user-uuid-1', 'recipe-uuid-1'),
    ).rejects.toThrow('upload failed');
  });
});
