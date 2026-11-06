import {manipulateAsync, SaveFormat} from 'expo-image-manipulator';

/**
 * Pure crop geometry for the recipe image crop step (#406), plus the
 * expo-image-manipulator step that turns a crop rectangle in natural-image
 * pixels into a cropped image. Mirrors the web helper in
 * packages/web/src/lib/recipeImageCrop.ts.
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

/**
 * Crop `uri` to `rect` (natural pixels) with expo-image-manipulator. PNG
 * sources stay PNG; everything else is written as JPEG (the manipulator only
 * emits JPEG/PNG), and the returned content type says so honestly.
 */
export const cropPickedImage = async (
  uri: string,
  rect: CropRect,
  sourceContentType: string,
): Promise<CroppedRecipeImage> => {
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
