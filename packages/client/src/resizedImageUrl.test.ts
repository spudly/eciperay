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

  test('marker text in an external URL query string passes through untouched', () => {
    const external =
      'https://cdn.example/photo.jpg?source=/storage/v1/object/public/recipe-images/user/photo.jpg';
    expect(resizedImageUrl(external, 400)).toBe(external);
  });

  test('malformed percent sequence returns the original URL', () => {
    const malformed = `${bucketUrl}%FF`;
    expect(resizedImageUrl(malformed, 400)).toBe(malformed);
  });

  test('carries the v revision into the resize URL', () => {
    expect(resizedImageUrl(`${bucketUrl}?v=123`, 400)).toBe(
      '/api/images/resize?path=user-1%2Frecipe-1&w=400&v=123',
    );
    // Other query params are not carried.
    expect(resizedImageUrl(`${bucketUrl}?token=1&v=7`, 400)).toBe(
      '/api/images/resize?path=user-1%2Frecipe-1&w=400&v=7',
    );
    expect(resizedImageUrl(`${bucketUrl}?token=1`, 400)).not.toContain('v=');
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
