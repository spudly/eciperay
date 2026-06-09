import {jest} from '@jest/globals';

import {resolveImportedImageUrl} from './uploadRecipeImageServer.js';

const makeFetchResponse = (buffer: Buffer, contentType: string, ok = true) => ({
  ok,
  headers: {
    get: (name: string) => (name === 'content-type' ? contentType : null),
  },
  arrayBuffer: async () => buffer,
});

describe('resolveImportedImageUrl', () => {
  test('downloads remote URLs and uploads them to storage', async () => {
    const imageBytes = Buffer.from('fake-image');
    const uploadFn = jest
      .fn<() => Promise<string>>()
      .mockResolvedValue('https://cdn.example/recipe.jpg');
    const fetchFn = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        makeFetchResponse(imageBytes, 'image/jpeg') as unknown as Response,
      );
    await expect(
      resolveImportedImageUrl(
        'https://example.com/photo.jpg',
        'user-uuid-1',
        'recipe-uuid-1',
        {uploadFn, fetchFn},
      ),
    ).resolves.toBe('https://cdn.example/recipe.jpg');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://example.com/photo.jpg',
      expect.objectContaining({headers: {'User-Agent': 'Recipoo/1.0'}}),
    );
    expect(uploadFn).toHaveBeenCalledWith(
      'user-uuid-1',
      'recipe-uuid-1',
      imageBytes,
      'image/jpeg',
    );
  });

  test('returns null when a remote image cannot be downloaded', async () => {
    const uploadFn = jest.fn<() => Promise<string>>();
    const fetchFn = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        makeFetchResponse(Buffer.from(''), 'text/html') as unknown as Response,
      );
    await expect(
      resolveImportedImageUrl(
        'https://example.com/photo.jpg',
        'user-uuid-1',
        'recipe-uuid-1',
        {uploadFn, fetchFn},
      ),
    ).resolves.toBeNull();
    expect(uploadFn).not.toHaveBeenCalled();
  });

  test('uploads data URLs through the provided uploader', async () => {
    const uploadFn = jest
      .fn<() => Promise<string>>()
      .mockResolvedValue('https://cdn.example/recipe.png');
    const dataUrl = `data:image/png;base64,${Buffer.from('pixels').toString('base64')}`;
    await expect(
      resolveImportedImageUrl(dataUrl, 'user-uuid-1', 'recipe-uuid-1', {
        uploadFn,
      }),
    ).resolves.toBe('https://cdn.example/recipe.png');
    expect(uploadFn).toHaveBeenCalledWith(
      'user-uuid-1',
      'recipe-uuid-1',
      expect.any(Buffer),
      'image/png',
    );
  });
});
