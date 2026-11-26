/**
 * App execution step for the recipe image crop (#406): the
 * expo-image-manipulator step that turns a crop rectangle in natural-image
 * pixels into a cropped image. The pure crop geometry lives in
 * @eciperay/client (#677) and is re-exported here so existing app imports
 * keep working.
 *
 * Expo native modules are registered through Expo autolinking (#453: the
 * iOS Podfile's use_expo_modules! and the Android expo-autolinking-settings
 * Gradle plugin), so expo-image-manipulator is imported statically here.
 */
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator';

import type {CropRect} from '@eciperay/client';

export {
  clampCropRect,
  defaultCropRect,
  MIN_CROP_SIZE,
  moveCropRect,
  RECIPE_CROP_ASPECT,
  resizeCropRect,
  type CropRect,
} from '@eciperay/client';

export type CroppedRecipeImage = {
  base64: string;
  contentType: string;
  uri: string;
};

/**
 * Crop `uri` to `rect` (natural pixels) with expo-image-manipulator. PNG
 * sources stay PNG; everything else is written as JPEG (the manipulator only
 * emits JPEG/PNG), and the returned content type says so honestly.
 *
 * A crop the manipulator attempts but cannot produce throws.
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
