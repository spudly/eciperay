import type {SupabaseClient} from '@supabase/supabase-js';

import {
  decodeBase64ToBytes,
  RECIPE_IMAGES_BUCKET,
  recipeImageStoragePath,
  uploadRecipeImage,
  uploadRecipeImageBytes,
  uploadRecipeImageFromBase64,
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

describe('decodeBase64ToBytes', () => {
  test('decodes base64 image data', () => {
    expect([...decodeBase64ToBytes(btoa('pixels'))]).toEqual([
      112, 105, 120, 101, 108, 115,
    ]);
  });

  test('throws when base64 decoding is unavailable', () => {
    const originalAtob = globalThis.atob;
    Object.defineProperty(globalThis, 'atob', {value: undefined});
    expect(() => {
      decodeBase64ToBytes(btoa('pixels'));
    }).toThrow('Base64 decoding is not available');
    Object.defineProperty(globalThis, 'atob', {value: originalAtob});
  });
});

describe('uploadRecipeImageBytes', () => {
  test('uploads bytes and returns the public URL', async () => {
    const {client, from, upload, getPublicUrl} = makeSupabase();
    const bytes = new Uint8Array([1, 2, 3]);

    await expect(
      uploadRecipeImageBytes(client, bytes, 'image/png', {
        userId: 'user-uuid-1',
        recipeId: 'recipe-uuid-1',
      }),
    ).resolves.toBe('https://cdn.example/recipe.png');

    expect(from).toHaveBeenCalledWith(RECIPE_IMAGES_BUCKET);
    expect(upload).toHaveBeenCalledWith('user-uuid-1/recipe-uuid-1', bytes, {
      contentType: 'image/png',
      upsert: true,
    });
    expect(getPublicUrl).toHaveBeenCalledWith('user-uuid-1/recipe-uuid-1');
  });

  test('throws when storage upload fails', async () => {
    const {client, upload} = makeSupabase();
    upload.mockResolvedValue({error: new Error('upload failed')});
    await expect(
      uploadRecipeImageBytes(client, new Uint8Array([1]), 'image/png', {
        userId: 'user-uuid-1',
        recipeId: 'recipe-uuid-1',
      }),
    ).rejects.toThrow('upload failed');
  });
});

describe('uploadRecipeImageFromBase64', () => {
  test('uploads decoded base64 image data', async () => {
    const {client, upload} = makeSupabase();

    await expect(
      uploadRecipeImageFromBase64(client, btoa('pixels'), 'image/png', {
        userId: 'user-uuid-1',
        recipeId: 'recipe-uuid-1',
      }),
    ).resolves.toBe('https://cdn.example/recipe.png');

    expect(upload).toHaveBeenCalledWith(
      'user-uuid-1/recipe-uuid-1',
      decodeBase64ToBytes(btoa('pixels')),
      {contentType: 'image/png', upsert: true},
    );
  });
});
