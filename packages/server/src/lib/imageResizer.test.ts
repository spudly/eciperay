import {
  contentTypeForFormat,
  deleteResizedVariants,
  deleteResizedVariantsForPublicUrl,
  imageKeyFromPublicUrl,
  isValidImageKey,
  parseImageWidth,
  sharpResize,
  variantKeyFor,
  type ImageStorage,
} from './imageResizer.js';

describe('parseImageWidth', () => {
  test('accepts bounds and rejects invalid', () => {
    expect(parseImageWidth('16')).toBe(16);
    expect(parseImageWidth('1600')).toBe(1600);
    expect(parseImageWidth('15')).toBeNull();
    expect(parseImageWidth('1601')).toBeNull();
    expect(parseImageWidth('abc')).toBeNull();
    expect(parseImageWidth(undefined)).toBeNull();
    expect(parseImageWidth(400)).toBeNull();
  });
});

describe('helpers', () => {
  test('variant key and validation and format mapping', () => {
    expect(variantKeyFor('u/r', 400)).toBe('u/r__w400');
    expect(isValidImageKey('u/r')).toBe(true);
    expect(isValidImageKey('../x')).toBe(false);
    expect(isValidImageKey('')).toBe(false);
    expect(isValidImageKey('/x')).toBe(false);
    expect(contentTypeForFormat('png')).toBe('image/png');
    expect(contentTypeForFormat('jpeg')).toBe('image/jpeg');
    expect(contentTypeForFormat(undefined)).toBe('image/jpeg');
    expect(contentTypeForFormat('unknown')).toBe('image/jpeg');
  });

  test('sharpResize resizes a real png without enlargement', async () => {
    const sharp = (await import('sharp')).default;
    const input = await sharp({
      create: {width: 100, height: 50, channels: 3, background: '#888888'},
    })
      .png()
      .toBuffer();
    const out = await sharpResize(input, 50);
    expect(out.contentType).toBe('image/png');
    const meta = await sharp(out.buffer).metadata();
    expect(meta.width).toBe(50);
    const notEnlarged = await sharpResize(input, 1600);
    expect((await sharp(notEnlarged.buffer).metadata()).width).toBe(100);
  });
});

describe('deleteResizedVariants', () => {
  const makeStorage = (listed: string[]): ImageStorage & {removed: string[][]} => {
    const removed: string[][] = [];
    return {
      removed,
      download: async () => null,
      upload: async () => {},
      list: async () => listed,
      remove: async keys => {
        removed.push(keys);
      },
    };
  };

  test('lists by prefix and removes only variants', async () => {
    const storage = makeStorage(['u/r__w400', 'u/r__w800', 'u/other__w400']);
    // list mock returns names as full keys here; filter keeps u/r__w*
    await expect(deleteResizedVariants('u/r', storage)).resolves.toEqual([
      'u/r__w400',
      'u/r__w800',
    ]);
    expect(storage.removed).toEqual([['u/r__w400', 'u/r__w800']]);
  });

  test('no variants removes nothing', async () => {
    const storage = makeStorage([]);
    await expect(deleteResizedVariants('u/r', storage)).resolves.toEqual([]);
    expect(storage.removed).toEqual([]);
  });

  test('storage errors are swallowed', async () => {
    const storage = makeStorage([]);
    storage.list = async () => {
      throw new Error('list failed');
    };
    await expect(deleteResizedVariants('u/r', storage)).resolves.toEqual([]);
  });

  test('public URL extraction and invalidation', async () => {
    expect(
      imageKeyFromPublicUrl(
        'https://x.supabase.co/storage/v1/object/public/recipe-images/u/r?x=1',
      ),
    ).toBe('u/r');
    expect(imageKeyFromPublicUrl('https://cdn.example/photo.jpg')).toBeNull();
    expect(imageKeyFromPublicUrl(null)).toBeNull();
    const storage = makeStorage(['u/r__w400']);
    await expect(
      deleteResizedVariantsForPublicUrl(
        'https://x/storage/v1/object/public/recipe-images/u/r',
        storage,
      ),
    ).resolves.toEqual(['u/r__w400']);
    await expect(
      deleteResizedVariantsForPublicUrl('https://cdn.example/x.jpg', storage),
    ).resolves.toEqual([]);
  });
});
