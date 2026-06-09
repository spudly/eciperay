import {jest} from '@jest/globals';

const mockUpload = jest.fn<() => Promise<{error: Error | null}>>();
const mockGetPublicUrl = jest.fn<() => {data: {publicUrl: string}}>();

jest.unstable_mockModule('../supabase.js', () => ({
  supabase: {
    storage: {
      from: () => ({upload: mockUpload, getPublicUrl: mockGetPublicUrl}),
    },
  },
}));

const {resolveImportedImageUrl, uploadRecipeImageBuffer} =
  await import('./uploadRecipeImageServer.js');

const makeFetchResponse = (buffer: Buffer, contentType: string, ok = true) => ({
  ok,
  headers: {
    get: (name: string) => (name === 'content-type' ? contentType : null),
  },
  arrayBuffer: async () => buffer,
});

describe('uploadRecipeImageBuffer', () => {
  test('uploads a buffer and returns the public URL', async () => {
    mockUpload.mockResolvedValue({error: null});
    mockGetPublicUrl.mockReturnValue({
      data: {publicUrl: 'https://cdn.example/recipe.jpg'},
    });
    await expect(
      uploadRecipeImageBuffer(
        'user-uuid-1',
        'recipe-uuid-1',
        Buffer.from('pixels'),
        'image/jpeg',
      ),
    ).resolves.toBe('https://cdn.example/recipe.jpg');
    expect(mockUpload).toHaveBeenCalledWith(
      'user-uuid-1/recipe-uuid-1',
      Buffer.from('pixels'),
      {contentType: 'image/jpeg', upsert: true},
    );
  });

  test('throws when storage upload fails', async () => {
    mockUpload.mockResolvedValue({error: new Error('upload failed')});
    await expect(
      uploadRecipeImageBuffer(
        'user-uuid-1',
        'recipe-uuid-1',
        Buffer.from('pixels'),
        'image/jpeg',
      ),
    ).rejects.toThrow('upload failed');
  });
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

  test('returns null for invalid data URLs', async () => {
    const uploadFn = jest.fn<() => Promise<string>>();
    await expect(
      resolveImportedImageUrl(
        'data:text/plain;base64,abc',
        'user-uuid-1',
        'recipe-uuid-1',
        {uploadFn},
      ),
    ).resolves.toBeNull();
    expect(uploadFn).not.toHaveBeenCalled();
  });

  test('returns null when a remote download fails', async () => {
    const uploadFn = jest.fn<() => Promise<string>>();
    const fetchFn = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('network error'));
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

  test('returns null when a remote response is not ok', async () => {
    const uploadFn = jest.fn<() => Promise<string>>();
    const fetchFn = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        makeFetchResponse(
          Buffer.from(''),
          'image/jpeg',
          false,
        ) as unknown as Response,
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

  test('returns null when a remote image is empty', async () => {
    const uploadFn = jest.fn<() => Promise<string>>();
    const fetchFn = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        makeFetchResponse(Buffer.alloc(0), 'image/jpeg') as unknown as Response,
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

  test('returns null when a remote image exceeds the size limit', async () => {
    const uploadFn = jest.fn<() => Promise<string>>();
    const fetchFn = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        makeFetchResponse(
          Buffer.alloc(10 * 1024 * 1024 + 1),
          'image/jpeg',
        ) as unknown as Response,
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
});
