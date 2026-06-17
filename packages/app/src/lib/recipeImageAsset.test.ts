import ReactNativeBlobUtil from 'react-native-blob-util';

import {
  base64ImagePreviewUri,
  deleteImagePreviewFile,
  recipeImageFromAsset,
  stripImageCacheKey,
  withImageCacheKey,
  writeBase64ImagePreview,
} from './recipeImageAsset';

const mockWriteFile = ReactNativeBlobUtil.fs.writeFile as jest.Mock;
const mockUnlink = ReactNativeBlobUtil.fs.unlink as jest.Mock;
const mockExists = ReactNativeBlobUtil.fs.exists as jest.Mock;

describe('recipeImageFromAsset', () => {
  test('returns base64 payload for a valid asset', () => {
    expect(
      recipeImageFromAsset({
        base64: btoa('pixels'),
        type: 'image/png',
        uri: 'file://recipe.png',
        fileSize: 6,
      }),
    ).toEqual({base64: btoa('pixels'), contentType: 'image/png'});
  });

  test('throws when base64 data is missing', () => {
    expect(() => {
      recipeImageFromAsset({uri: 'file://recipe.png', type: 'image/png'});
    }).toThrow('Failed to read image');
  });

  test('rejects unsupported content types', () => {
    expect(() => {
      recipeImageFromAsset({
        base64: btoa('pixels'),
        type: 'text/plain',
        uri: 'file://recipe.txt',
        fileSize: 6,
      });
    }).toThrow('Please choose a JPEG, PNG, GIF, or WebP image');
  });

  test('uses default content type and estimated size when missing', () => {
    expect(
      recipeImageFromAsset({base64: btoa('pixels'), uri: 'file://recipe.png'}),
    ).toEqual({base64: btoa('pixels'), contentType: 'image/jpeg'});
  });
});

describe('recipe image preview files', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    mockWriteFile.mockClear();
    mockUnlink.mockClear();
    mockExists.mockClear();
    mockExists.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('writes base64 image data to the cache directory', async () => {
    await expect(
      writeBase64ImagePreview(btoa('pixels'), 'image/png'),
    ).resolves.toBe('file:///cache/recipe-preview-1700000000000.png');

    expect(mockWriteFile).toHaveBeenCalledWith(
      '/cache/recipe-preview-1700000000000.png',
      btoa('pixels'),
      'base64',
    );
  });

  test('uses a generic extension for unknown content types', async () => {
    await expect(
      writeBase64ImagePreview(btoa('pixels'), 'image/bmp'),
    ).resolves.toBe('file:///cache/recipe-preview-1700000000000.img');
  });

  test('maps supported content types to file extensions', async () => {
    await expect(
      writeBase64ImagePreview(btoa('pixels'), 'image/jpeg'),
    ).resolves.toBe('file:///cache/recipe-preview-1700000000000.jpg');
    await expect(
      writeBase64ImagePreview(btoa('pixels'), 'image/gif'),
    ).resolves.toBe('file:///cache/recipe-preview-1700000000000.gif');
    await expect(
      writeBase64ImagePreview(btoa('pixels'), 'image/webp'),
    ).resolves.toBe('file:///cache/recipe-preview-1700000000000.webp');
  });

  test('deletes preview files from the cache directory', async () => {
    await deleteImagePreviewFile(
      'file:///cache/recipe-preview-1700000000000.png',
    );

    expect(mockExists).toHaveBeenCalledWith(
      '/cache/recipe-preview-1700000000000.png',
    );
    expect(mockUnlink).toHaveBeenCalledWith(
      '/cache/recipe-preview-1700000000000.png',
    );
  });

  test('deletes preview files without a file uri prefix', async () => {
    await deleteImagePreviewFile('/cache/recipe-preview-1700000000000.png');

    expect(mockExists).toHaveBeenCalledWith(
      '/cache/recipe-preview-1700000000000.png',
    );
  });

  test('ignores non-preview uris and missing files', async () => {
    mockExists.mockResolvedValueOnce(false);
    await deleteImagePreviewFile('file:///cache/other-file.png');
    await deleteImagePreviewFile('https://cdn.example/recipe.png');

    expect(mockUnlink).not.toHaveBeenCalled();
  });

  test('ignores preview cleanup failures', async () => {
    mockExists.mockRejectedValueOnce(new Error('read failed'));
    await deleteImagePreviewFile(
      'file:///cache/recipe-preview-1700000000000.png',
    );
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  test('builds data uris and cache-busted remote urls', () => {
    expect(base64ImagePreviewUri(btoa('pixels'), 'image/png')).toBe(
      `data:image/png;base64,${btoa('pixels')}`,
    );
    expect(stripImageCacheKey('https://cdn.example/a.png?v=1')).toBe(
      'https://cdn.example/a.png',
    );
    expect(withImageCacheKey('https://cdn.example/a.png?v=1', 42)).toBe(
      'https://cdn.example/a.png?v=42',
    );
    expect(stripImageCacheKey('')).toBe('');
  });
});
