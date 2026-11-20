export const RECIPE_IMAGES_PUBLIC_MARKER =
  '/storage/v1/object/public/recipe-images/';

export const IMAGE_RESIZER_PATH = '/api/images/resize';

export const clampImageWidth = (width: number): number =>
  Math.min(1600, Math.max(16, Math.round(width)));

/**
 * Rewrite a Supabase `recipe-images` bucket public URL to the server's
 * generic on-the-fly image resizer endpoint (#618). External or
 * non-bucket URLs pass through untouched; null stays null.
 */
export function resizedImageUrl(
  imageUrl: string | null | undefined,
  width: number,
): string | null {
  if (imageUrl == null) {
    return null;
  }
  const markerIndex = imageUrl.indexOf(RECIPE_IMAGES_PUBLIC_MARKER);
  if (markerIndex === -1) {
    return imageUrl;
  }
  const rawPath = imageUrl.slice(markerIndex + RECIPE_IMAGES_PUBLIC_MARKER.length);
  const key = decodeURIComponent(rawPath.split(/[?#]/)[0] ?? '');
  if (!key) {
    return imageUrl;
  }
  return `${IMAGE_RESIZER_PATH}?path=${encodeURIComponent(key)}&w=${clampImageWidth(width)}`;
}

export const resizedRecipeImageUrl = resizedImageUrl;
