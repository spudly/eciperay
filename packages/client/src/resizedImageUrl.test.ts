import {clampImageWidth, resizedImageUrl, resizedRecipeImageUrl} from './resizedImageUrl.js';

const bucketUrl =
  'https://abc.supabase.co/storage/v1/object/public/recipe-images/user-1/recipe-1';

describe('resizedImageUrl', () => {
  test('rewrites bucket URLs to the resizer endpoint', () => {
    expect(resizedImageUrl(bucketUrl, 400)).toBe(
      '/api/images/resize?path=user-1%2Frecipe-1&w=400',
    );
    expect(resizedRecipeImageUrl(bucketUrl, 1200)).toBe(
      '/api/images/resize?path=user-1%2Frecipe-1&w=1200',
    );
  });

  test('strips query from bucket URL', () => {
    expect(resizedImageUrl(`${bucketUrl}?token=1`, 400)).toContain('w=400');
  });

  test('external URLs pass through untouched', () => {
    expect(resizedImageUrl('https://cdn.example/photo.jpg', 400)).toBe(
      'https://cdn.example/photo.jpg',
    );
  });

  test('null and undefined stay null', () => {
    expect(resizedImageUrl(null, 400)).toBeNull();
    expect(resizedImageUrl(undefined, 400)).toBeNull();
  });

  test('clamps width', () => {
    expect(clampImageWidth(1)).toBe(16);
    expect(clampImageWidth(9999)).toBe(1600);
    expect(resizedImageUrl(bucketUrl, 9999)).toContain('w=1600');
  });
});
