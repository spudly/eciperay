/**
 * Pure crop geometry for the recipe image crop step (#406), plus the
 * expo-image-manipulator step that turns a crop rectangle in natural-image
 * pixels into a cropped image. Mirrors the web helper in
 * packages/web/src/lib/recipeImageCrop.ts.
 *
 * Expo-image-manipulator is loaded lazily inside cropPickedImage, never at
 * module scope: the app does not register Expo native modules yet (no Expo
 * autolinking — split into #453), so a static import throws requireNativeModule
 * at load time and takes the whole recipe form down with it. The lazy load
 * turns that into a graceful fallback to the uncropped image (Stephen's Option
 * 3 decision on #446, 2026-11-06).
 */

export type CropRect = {x: number; y: number; width: number; height: number};

/** Recipe photos render in a 4:3 frame, so the default crop box uses it. */
export const RECIPE_CROP_ASPECT = 4 / 3;

export const MIN_CROP_SIZE = 24;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

/** Largest centered rectangle of `aspect` (width / height) inside the image. */
export const defaultCropRect = (
  imageWidth: number,
  imageHeight: number,
  aspect: number = RECIPE_CROP_ASPECT,
): CropRect => {
  const safeWidth = Math.max(1, Math.floor(imageWidth));
  const safeHeight = Math.max(1, Math.floor(imageHeight));
  let width = safeWidth;
  let height = Math.round(width / aspect);
  if (height > safeHeight) {
    height = safeHeight;
    width = Math.round(height * aspect);
  }
  return {
    x: Math.floor((safeWidth - width) / 2),
    y: Math.floor((safeHeight - height) / 2),
    width,
    height,
  };
};

/** Clamp a crop rectangle so it stays fully inside the image. */
export const clampCropRect = (
  rect: CropRect,
  imageWidth: number,
  imageHeight: number,
): CropRect => {
  const minWidth = Math.min(MIN_CROP_SIZE, imageWidth);
  const minHeight = Math.min(MIN_CROP_SIZE, imageHeight);
  const width = clamp(Math.round(rect.width), minWidth, imageWidth);
  const height = clamp(Math.round(rect.height), minHeight, imageHeight);
  return {
    x: clamp(Math.round(rect.x), 0, imageWidth - width),
    y: clamp(Math.round(rect.y), 0, imageHeight - height),
    width,
    height,
  };
};

export const moveCropRect = (
  rect: CropRect,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): CropRect =>
  clampCropRect(
    {...rect, x: rect.x + deltaX, y: rect.y + deltaY},
    imageWidth,
    imageHeight,
  );

/** Resize from the bottom-right corner, keeping the top-left anchored. */
export const resizeCropRect = (
  rect: CropRect,
  deltaWidth: number,
  deltaHeight: number,
  imageWidth: number,
  imageHeight: number,
): CropRect =>
  clampCropRect(
    {
      ...rect,
      width: rect.width + deltaWidth,
      height: rect.height + deltaHeight,
    },
    imageWidth,
    imageHeight,
  );

export type CroppedRecipeImage = {
  base64: string;
  contentType: string;
  uri: string;
};

type ImageManipulator = typeof import('expo-image-manipulator');

/**
 * Load expo-image-manipulator on demand. Returns null when the package's native
 * module is not registered (the current native builds): evaluating the package
 * entry calls requireNativeModule, which throws in that case.
 */
const loadImageManipulator = (): ImageManipulator | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberate lazy load, see the module header
    return require('expo-image-manipulator') as ImageManipulator;
  } catch {
    return null;
  }
};

/**
 * Crop `uri` to `rect` (natural pixels) with expo-image-manipulator. PNG
 * sources stay PNG; everything else is written as JPEG (the manipulator only
 * emits JPEG/PNG), and the returned content type says so honestly.
 *
 * Returns null when the native manipulator is unavailable, so the caller can
 * fall back to the uncropped image instead of failing; a crop that the
 * manipulator attempts but cannot produce still throws.
 */
export const cropPickedImage = async (
  uri: string,
  rect: CropRect,
  sourceContentType: string,
): Promise<CroppedRecipeImage | null> => {
  const manipulator = loadImageManipulator();
  if (!manipulator) {
    return null;
  }
  const {manipulateAsync, SaveFormat} = manipulator;
  const keepPng = sourceContentType === 'image/png';
  // manipulateAsync is marked deprecated upstream in favour of the
  // useImageManipulator hook; a hook cannot run inside this plain async
  // helper, and manipulateAsync remains the supported imperative API in
  // expo-image-manipulator 58, so it is the deliberate choice here.
  const saved = await manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: Math.round(rect.x),
          originY: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      },
    ],
    {
      base64: true,
      compress: 1,
      format: keepPng ? SaveFormat.PNG : SaveFormat.JPEG,
    },
  );
  if (!saved.base64) {
    throw new Error('Failed to crop image');
  }
  return {
    base64: saved.base64,
    contentType: keepPng ? 'image/png' : 'image/jpeg',
    uri: saved.uri,
  };
};
