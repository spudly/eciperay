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
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return imageUrl;
  }
  // Match the bucket pathname only: marker text appearing in an external
  // URL's query string or fragment must not trigger a rewrite.
  if (!parsed.pathname.startsWith(RECIPE_IMAGES_PUBLIC_MARKER)) {
    return imageUrl;
  }
  const rawPath = parsed.pathname.slice(RECIPE_IMAGES_PUBLIC_MARKER.length);
  let key: string;
  try {
    key = decodeURIComponent(rawPath);
  } catch {
    return imageUrl;
  }
  if (!key) {
    return imageUrl;
  }
  // Carry the withImageCacheKey revision (`?v=`) so a same-key replacement
  // with a new revision gets a distinct resize URL / cache identity.
  const revision = parsed.searchParams.get('v');
  const revisionPart = revision ? `&v=${encodeURIComponent(revision)}` : '';
  return `${IMAGE_RESIZER_PATH}?path=${encodeURIComponent(key)}&w=${clampImageWidth(width)}${revisionPart}`;
}

export const resizedRecipeImageUrl = resizedImageUrl;
