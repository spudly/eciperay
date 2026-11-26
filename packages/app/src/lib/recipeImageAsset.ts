import {validateRecipeImageContent} from '@eciperay/client';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type {Asset} from 'react-native-image-picker';

export type PendingRecipeImage = {base64: string; contentType: string};

const extensionForContentType = (contentType: string): string => {
  switch (contentType) {
    case 'image/jpeg': {
      return 'jpg';
    }
    case 'image/png': {
      return 'png';
    }
    case 'image/gif': {
      return 'gif';
    }
    case 'image/webp': {
      return 'webp';
    }
    default: {
      return 'img';
    }
  }
};

export const base64ImagePreviewUri = (base64: string, contentType: string) =>
  `data:${contentType};base64,${base64}`;

const previewFilePath = (uri: string): string =>
  uri.startsWith('file://') ? uri.slice('file://'.length) : uri;

export const writeBase64ImagePreview = async (
  base64: string,
  contentType: string,
): Promise<string> => {
  const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/recipe-preview-${Date.now()}.${extensionForContentType(contentType)}`;
  await ReactNativeBlobUtil.fs.writeFile(filePath, base64, 'base64');
  return `file://${filePath}`;
};

export const deleteImagePreviewFile = async (uri: string): Promise<void> => {
  if (!uri.includes('recipe-preview-')) {
    return;
  }
  const filePath = previewFilePath(uri);
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(filePath);
    if (exists) {
      await ReactNativeBlobUtil.fs.unlink(filePath);
    }
  } catch {
    // Preview cleanup is best-effort.
  }
};

export const RECIPE_IMAGE_READ_ERROR_CODE = 'recipe-image-read-failed';

/**
 * The known failure for a picker asset that carries no image data. It
 * carries a stable code instead of relying on its (English) message, so
 * hosts can resolve it through their Lingui catalog
 * (`recipeForm.readImageError`) instead of showing the raw message.
 */
export class RecipeImageReadError extends Error {
  readonly code = RECIPE_IMAGE_READ_ERROR_CODE;

  constructor() {
    super('Failed to read image');
    this.name = 'RecipeImageReadError';
  }
}

export const isRecipeImageReadError = (error_: unknown): boolean =>
  error_ instanceof RecipeImageReadError ||
  (error_ instanceof Error &&
    (error_ as {code?: unknown}).code === RECIPE_IMAGE_READ_ERROR_CODE);

export const recipeImageFromAsset = (asset: Asset): PendingRecipeImage => {
  const base64 = asset.base64;
  // react-native-image-picker reports iOS JPEGs as image/jpg, which the
  // validator (and the server schema) only accept as image/jpeg.
  const contentType =
    asset.type === 'image/jpg' ? 'image/jpeg' : (asset.type ?? 'image/jpeg');
  if (!base64) {
    throw new RecipeImageReadError();
  }
  const byteLength = asset.fileSize ?? Math.floor((base64.length * 3) / 4);
  validateRecipeImageContent(contentType, byteLength);
  return {base64, contentType};
};
